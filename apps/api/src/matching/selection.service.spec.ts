import { Test } from '@nestjs/testing';
import { MatchStatus, OpportunityStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SelectionService } from './selection.service';

describe('SelectionService', () => {
  let service: SelectionService;
  let prisma: {
    match: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    tutorOpportunity: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const clientUserId = 'client-1';
  const tutorUserId = 'tutor-1';
  const requestId = 'request-1';
  const matchId = 'match-1';
  const opportunityId = 'opp-1';

  const baseMatch = {
    id: matchId,
    tutorRequestId: requestId,
    tutorId: tutorUserId,
    score: 90,
    factorScores: {},
    matchReasons: [],
    status: MatchStatus.RECOMMENDED,
    createdAt: new Date(),
    updatedAt: new Date(),
    tutorRequest: { id: requestId, userId: clientUserId, status: 'PENDING' },
    tutor: {
      id: tutorUserId,
      status: 'ACTIVE',
      tutorProfile: { status: 'ACTIVE' },
    },
    opportunity: null,
  };

  const baseOpportunity = {
    id: opportunityId,
    matchId,
    tutorId: tutorUserId,
    tutorRequestId: requestId,
    status: OpportunityStatus.PENDING,
    respondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    match: { id: matchId, score: 90, matchReasons: [], factorScores: {} },
    tutorRequest: {
      id: requestId,
      subjects: ['Physics'],
      academicLevels: ['Grade 10'],
      teachingModes: ['IN_PERSON'],
      location: 'Addis Ababa',
      serviceArea: 'Bole',
      notes: null,
      schedule: [],
    },
  };

  beforeEach(async () => {
    const txMock = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        match: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
        },
        tutorOpportunity: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      });
    });

    const module = await Test.createTestingModule({
      providers: [
        SelectionService,
        {
          provide: PrismaService,
          useValue: {
            match: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            tutorOpportunity: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            $transaction: txMock,
          },
        },
      ],
    }).compile();

    service = module.get(SelectionService);
    prisma = module.get(PrismaService) as never;
  });

  /**
   * Helpers to set up $transaction to use the outer mocks for simplicity in
   * tests that check specific prisma calls.
   */
  function mockTransactionWithOuterPrisma() {
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
  }

  describe('selectMatch', () => {
    it('marks the match as SELECTED and creates an opportunity', async () => {
      mockTransactionWithOuterPrisma();

      prisma.match.findUnique.mockResolvedValue(baseMatch);
      prisma.match.findFirst.mockResolvedValue(null);
      prisma.match.update.mockResolvedValue({ ...baseMatch, status: MatchStatus.SELECTED });
      prisma.tutorOpportunity.create.mockResolvedValue({
        id: opportunityId,
        status: OpportunityStatus.PENDING,
      });

      const result = await service.selectMatch(clientUserId, matchId);

      expect(prisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: MatchStatus.SELECTED } }),
      );
      expect(prisma.tutorOpportunity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matchId,
            tutorId: tutorUserId,
            tutorRequestId: requestId,
            status: OpportunityStatus.PENDING,
          }),
        }),
      );
      expect(result.status).toBe(MatchStatus.SELECTED);
      expect(result.opportunityId).toBe(opportunityId);
    });

    it('works for a VIEWED match as well as RECOMMENDED', async () => {
      mockTransactionWithOuterPrisma();

      prisma.match.findUnique.mockResolvedValue({ ...baseMatch, status: MatchStatus.VIEWED });
      prisma.match.findFirst.mockResolvedValue(null);
      prisma.match.update.mockResolvedValue({ ...baseMatch, status: MatchStatus.SELECTED });
      prisma.tutorOpportunity.create.mockResolvedValue({ id: opportunityId, status: OpportunityStatus.PENDING });

      const result = await service.selectMatch(clientUserId, matchId);

      expect(result.status).toBe(MatchStatus.SELECTED);
    });

    it('is idempotent – returns existing opportunity without creating a duplicate', async () => {
      mockTransactionWithOuterPrisma();

      const existingOpportunity = { id: opportunityId, status: OpportunityStatus.PENDING };
      prisma.match.findUnique.mockResolvedValue({
        ...baseMatch,
        status: MatchStatus.RECOMMENDED,
        opportunity: existingOpportunity,
      });
      prisma.match.findFirst.mockResolvedValue(null);
      prisma.match.update.mockResolvedValue({ ...baseMatch, status: MatchStatus.SELECTED });

      const result = await service.selectMatch(clientUserId, matchId);

      // Opportunity already exists so create should NOT be called
      expect(prisma.tutorOpportunity.create).not.toHaveBeenCalled();
      expect(result.opportunityId).toBe(opportunityId);
      expect(result.status).toBe(MatchStatus.SELECTED);
    });

    it('throws 409 if the match is already in a terminal/non-selectable state', async () => {
      mockTransactionWithOuterPrisma();

      prisma.match.findUnique.mockResolvedValue({ ...baseMatch, status: MatchStatus.EXPIRED });

      await expect(service.selectMatch(clientUserId, matchId)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('throws 409 if a different match for the same request is already SELECTED', async () => {
      mockTransactionWithOuterPrisma();

      prisma.match.findUnique.mockResolvedValue(baseMatch);
      prisma.match.findFirst.mockResolvedValue({ id: 'match-other' }); // another selected match

      await expect(service.selectMatch(clientUserId, matchId)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('throws 409 if the tutor account is not active', async () => {
      mockTransactionWithOuterPrisma();

      prisma.match.findUnique.mockResolvedValue({
        ...baseMatch,
        tutor: { ...baseMatch.tutor, status: 'DISABLED' },
      });

      await expect(service.selectMatch(clientUserId, matchId)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('throws 409 if the tutor profile is not active', async () => {
      mockTransactionWithOuterPrisma();

      prisma.match.findUnique.mockResolvedValue({
        ...baseMatch,
        tutor: { ...baseMatch.tutor, tutorProfile: { status: 'SUSPENDED' } },
      });

      await expect(service.selectMatch(clientUserId, matchId)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('throws 403 when a different client tries to select the match', async () => {
      mockTransactionWithOuterPrisma();

      prisma.match.findUnique.mockResolvedValue(baseMatch);

      await expect(service.selectMatch('other-client', matchId)).rejects.toMatchObject({
        status: 403,
      });
    });

    it('throws 404 when the match does not exist', async () => {
      mockTransactionWithOuterPrisma();

      prisma.match.findUnique.mockResolvedValue(null);

      await expect(service.selectMatch(clientUserId, matchId)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('throws 409 when the DECLINED match is tried to be selected', async () => {
      mockTransactionWithOuterPrisma();

      prisma.match.findUnique.mockResolvedValue({ ...baseMatch, status: MatchStatus.DECLINED });

      await expect(service.selectMatch(clientUserId, matchId)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('listOpportunities', () => {
    it('returns all opportunities for the tutor', async () => {
      prisma.tutorOpportunity.findMany.mockResolvedValue([baseOpportunity]);

      const result = await service.listOpportunities(tutorUserId);

      expect(result.count).toBe(1);
      expect(result.opportunities[0]).toEqual(
        expect.objectContaining({
          id: opportunityId,
          status: OpportunityStatus.PENDING,
        }),
      );
    });

    it('returns request info without exposing client identity', async () => {
      prisma.tutorOpportunity.findMany.mockResolvedValue([baseOpportunity]);

      const result = await service.listOpportunities(tutorUserId);
      const request = result.opportunities[0].request;

      expect(request.subjects).toEqual(['Physics']);
      expect(request).not.toHaveProperty('userId');
      expect(request).not.toHaveProperty('clientName');
    });

    it('returns an empty list when no opportunities exist', async () => {
      prisma.tutorOpportunity.findMany.mockResolvedValue([]);

      const result = await service.listOpportunities(tutorUserId);

      expect(result.count).toBe(0);
      expect(result.opportunities).toEqual([]);
    });
  });

  describe('getOpportunity', () => {
    it('returns the opportunity detail for the owning tutor', async () => {
      prisma.tutorOpportunity.findUnique.mockResolvedValue(baseOpportunity);

      const result = await service.getOpportunity(tutorUserId, opportunityId);

      expect(result.id).toBe(opportunityId);
      expect(result.status).toBe(OpportunityStatus.PENDING);
      expect(result.request.subjects).toEqual(['Physics']);
    });

    it('throws 403 when a different tutor tries to read the opportunity', async () => {
      prisma.tutorOpportunity.findUnique.mockResolvedValue(baseOpportunity);

      await expect(service.getOpportunity('other-tutor', opportunityId)).rejects.toMatchObject({
        status: 403,
      });
    });

    it('throws 404 when the opportunity does not exist', async () => {
      prisma.tutorOpportunity.findUnique.mockResolvedValue(null);

      await expect(service.getOpportunity(tutorUserId, opportunityId)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('acceptOpportunity', () => {
    it('transitions a PENDING opportunity to ACCEPTED and records respondedAt', async () => {
      mockTransactionWithOuterPrisma();

      prisma.tutorOpportunity.findUnique.mockResolvedValue({
        id: opportunityId,
        tutorId: tutorUserId,
        status: OpportunityStatus.PENDING,
      });
      prisma.tutorOpportunity.update.mockResolvedValue({
        id: opportunityId,
        status: OpportunityStatus.ACCEPTED,
        respondedAt: new Date(),
      });

      const result = await service.acceptOpportunity(tutorUserId, opportunityId);

      expect(prisma.tutorOpportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: OpportunityStatus.ACCEPTED }),
        }),
      );
      expect(result.status).toBe(OpportunityStatus.ACCEPTED);
      expect(result.respondedAt).toBeInstanceOf(Date);
    });

    it('throws 409 when accepting an already-accepted opportunity', async () => {
      mockTransactionWithOuterPrisma();

      prisma.tutorOpportunity.findUnique.mockResolvedValue({
        id: opportunityId,
        tutorId: tutorUserId,
        status: OpportunityStatus.ACCEPTED,
      });

      await expect(service.acceptOpportunity(tutorUserId, opportunityId)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('throws 409 when accepting an expired opportunity', async () => {
      mockTransactionWithOuterPrisma();

      prisma.tutorOpportunity.findUnique.mockResolvedValue({
        id: opportunityId,
        tutorId: tutorUserId,
        status: OpportunityStatus.EXPIRED,
      });

      await expect(service.acceptOpportunity(tutorUserId, opportunityId)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('throws 409 when accepting a declined opportunity', async () => {
      mockTransactionWithOuterPrisma();

      prisma.tutorOpportunity.findUnique.mockResolvedValue({
        id: opportunityId,
        tutorId: tutorUserId,
        status: OpportunityStatus.DECLINED,
      });

      await expect(service.acceptOpportunity(tutorUserId, opportunityId)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('throws 403 when another tutor tries to accept', async () => {
      mockTransactionWithOuterPrisma();

      prisma.tutorOpportunity.findUnique.mockResolvedValue({
        id: opportunityId,
        tutorId: tutorUserId,
        status: OpportunityStatus.PENDING,
      });

      await expect(
        service.acceptOpportunity('other-tutor', opportunityId),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('throws 404 when the opportunity does not exist', async () => {
      mockTransactionWithOuterPrisma();

      prisma.tutorOpportunity.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptOpportunity(tutorUserId, opportunityId),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('declineOpportunity', () => {
    it('transitions a PENDING opportunity to DECLINED', async () => {
      mockTransactionWithOuterPrisma();

      prisma.tutorOpportunity.findUnique.mockResolvedValue({
        id: opportunityId,
        tutorId: tutorUserId,
        status: OpportunityStatus.PENDING,
      });
      prisma.tutorOpportunity.update.mockResolvedValue({
        id: opportunityId,
        status: OpportunityStatus.DECLINED,
        respondedAt: new Date(),
      });

      const result = await service.declineOpportunity(tutorUserId, opportunityId);

      expect(result.status).toBe(OpportunityStatus.DECLINED);
    });

    it('throws 409 when declining an already-terminal opportunity', async () => {
      mockTransactionWithOuterPrisma();

      prisma.tutorOpportunity.findUnique.mockResolvedValue({
        id: opportunityId,
        tutorId: tutorUserId,
        status: OpportunityStatus.CANCELLED,
      });

      await expect(
        service.declineOpportunity(tutorUserId, opportunityId),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('throws 403 when another tutor tries to decline', async () => {
      mockTransactionWithOuterPrisma();

      prisma.tutorOpportunity.findUnique.mockResolvedValue({
        id: opportunityId,
        tutorId: tutorUserId,
        status: OpportunityStatus.PENDING,
      });

      await expect(
        service.declineOpportunity('other-tutor', opportunityId),
      ).rejects.toMatchObject({ status: 403 });
    });
  });
});
