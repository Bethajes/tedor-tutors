import { Test } from '@nestjs/testing';
import { DayOfWeek, MatchStatus, UserRoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EligibilityService } from './eligibility.service';
import { ScoringService } from './scoring/scoring.service';
import { MatchingService } from './matching.service';

describe('MatchingService', () => {
  let service: MatchingService;
  let scoringService: ScoringService;
  let prisma: {
    tutorRequest: { findUnique: jest.Mock };
    tutorProfile: { findMany: jest.Mock };
    match: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const ownerId = 'client-1';
  const requestId = 'request-1';
  const otherClientId = 'client-2';
  const tutorUserId = 'tutor-1';

  const requestRecord = {
    id: requestId,
    userId: ownerId,
    status: 'PENDING',
    subjects: ['Physics'],
    academicLevels: ['Grade 10'],
    teachingModes: ['IN_PERSON'],
    location: 'Addis Ababa',
    serviceArea: 'Bole',
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    schedule: [
      { id: 'slot-1', tutorRequestId: requestId, dayOfWeek: DayOfWeek.MONDAY, startTime: '15:00', endTime: '17:00' },
    ],
  };

  const eligibleTutorProfile = {
    id: 'profile-1',
    userId: tutorUserId,
    status: 'ACTIVE',
    bio: null,
    photoUrl: null,
    location: 'Bole',
    serviceAreas: ['Bole'],
    teachingModes: ['IN_PERSON'],
    hourlyRate: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    user: { id: tutorUserId, name: 'Ada Lovelace', status: 'ACTIVE' },
    subjects: [
      { id: 's1', tutorProfileId: 'profile-1', subject: 'Physics', academicLevels: ['Grade 9', 'Grade 10'] },
    ],
    availability: [
      { id: 'a1', tutorProfileId: 'profile-1', dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '18:00' },
    ],
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MatchingService,
        EligibilityService,
        ScoringService,
        {
          provide: PrismaService,
          useValue: {
            tutorRequest: { findUnique: jest.fn() },
            tutorProfile: { findMany: jest.fn() },
            match: {
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn((operations: unknown[]) => Promise.resolve(operations)),
          },
        },
      ],
    }).compile();

    service = module.get(MatchingService);
    prisma = module.get(PrismaService) as never;
    scoringService = module.get(ScoringService);
  });

  describe('findEligibleTutors', () => {
    it('returns only eligible tutors for the request owner', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([eligibleTutorProfile]);

      const result = await service.findEligibleTutors(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.count).toBe(1);
      expect(result.tutors[0]).toEqual(
        expect.objectContaining({
          id: tutorUserId,
          name: 'Ada Lovelace',
          subjects: ['Physics'],
          levels: ['Grade 9', 'Grade 10'],
          teachingModes: ['IN_PERSON'],
          serviceAreas: ['Bole'],
        }),
      );
      expect(result.tutors[0]).toHaveProperty('score');
      expect(result.tutors[0].score).toEqual(
        expect.objectContaining({
          totalScore: expect.any(Number),
          factorScores: expect.objectContaining({
            subject: 100,
            availability: 100,
            academicLevel: 100,
            budget: 100,
          }),
          reasons: expect.any(Array),
        }),
      );
    });

    it('returns no tutors when a tutor fails the subject filter', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([
        {
          ...eligibleTutorProfile,
          subjects: [{ id: 's2', tutorProfileId: 'profile-1', subject: 'Biology', academicLevels: ['Grade 10'] }],
        },
      ]);

      const result = await service.findEligibleTutors(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.count).toBe(0);
      expect(result.tutors).toEqual([]);
    });

    it('excludes tutors whose availability conflicts with the request', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([
        {
          ...eligibleTutorProfile,
          availability: [
            {
              id: 'a2',
              tutorProfileId: 'profile-1',
              dayOfWeek: DayOfWeek.MONDAY,
              startTime: '09:00',
              endTime: '12:00',
            },
          ],
        },
      ]);

      const result = await service.findEligibleTutors(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.count).toBe(0);
    });

    it('excludes tutors with inactive accounts', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([
        { ...eligibleTutorProfile, user: { ...eligibleTutorProfile.user, status: 'DISABLED' } },
      ]);

      const result = await service.findEligibleTutors(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.count).toBe(0);
    });

    it('excludes tutors when the tutor profile is incomplete (no subjects)', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([
        { ...eligibleTutorProfile, subjects: [] },
      ]);

      const result = await service.findEligibleTutors(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.count).toBe(0);
    });

    it('does not consider tutors without a profile at all', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([]);

      const result = await service.findEligibleTutors(ownerId, UserRoleName.CLIENT, requestId);

      expect(prisma.tutorProfile.findMany).toHaveBeenCalled();
      expect(result.count).toBe(0);
    });

    it('throws 404 when the tutor request does not exist', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.findEligibleTutors(ownerId, UserRoleName.CLIENT, requestId),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('forbids a different client from viewing the request', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);

      await expect(
        service.findEligibleTutors(otherClientId, UserRoleName.CLIENT, requestId),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('forbids a tutor account from viewing another client request', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);

      await expect(
        service.findEligibleTutors(tutorUserId, UserRoleName.TUTOR, requestId),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('allows staff coordinators to view any request', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([eligibleTutorProfile]);

      const result = await service.findEligibleTutors(
        'coordinator-1',
        UserRoleName.COORDINATOR,
        requestId,
      );

      expect(result.count).toBe(1);
    });

    it('does not expose private tutor contact information', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([
        {
          ...eligibleTutorProfile,
          user: { id: tutorUserId, name: 'Ada Lovelace', status: 'ACTIVE' },
        },
      ]);

      const result = await service.findEligibleTutors(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.tutors[0]).not.toHaveProperty('email');
      expect(result.tutors[0]).not.toHaveProperty('phone');
      expect(result.tutors[0]).not.toHaveProperty('hourlyRate');
    });
  });

  describe('getTutorRequest', () => {
    it('returns the request summary for the owner', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);

      const result = await service.getTutorRequest(ownerId, UserRoleName.CLIENT, requestId);

      expect(result).toEqual(
        expect.objectContaining({
          id: requestId,
          status: 'PENDING',
          subjects: ['Physics'],
          academicLevels: ['Grade 10'],
          teachingModes: ['IN_PERSON'],
          serviceArea: 'Bole',
        }),
      );
      expect(result.schedule).toEqual([
        expect.objectContaining({ dayOfWeek: DayOfWeek.MONDAY, startTime: '15:00', endTime: '17:00' }),
      ]);
      expect(result.ready).toBe(true);
    });

    it('marks the request as not ready when required fields are missing', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue({
        ...requestRecord,
        subjects: [],
        academicLevels: [],
        teachingModes: [],
      });

      const result = await service.getTutorRequest(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.ready).toBe(false);
    });

    it('forbids a different client from reading the request', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);

      await expect(
        service.getTutorRequest(otherClientId, UserRoleName.CLIENT, requestId),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('throws 404 when the request does not exist', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.getTutorRequest(ownerId, UserRoleName.CLIENT, requestId),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('generateMatches', () => {
    function buildMatchRecord(overrides: Record<string, unknown> = {}) {
      return {
        id: `match-${overrides.tutorId ?? tutorUserId}`,
        tutorRequestId: requestId,
        tutorId: overrides.tutorId ?? tutorUserId,
        score: overrides.score ?? 92,
        factorScores: {
          subject: 100,
          availability: 100,
          academicLevel: 100,
          locationMode: 100,
          experience: 80,
          budget: 100,
          reliability: 80,
          preferences: 100,
        },
        matchReasons: ['Matches the requested subject', 'Available at the requested time'],
        status: MatchStatus.RECOMMENDED,
        createdAt: new Date('2026-09-01T00:00:00Z'),
        updatedAt: new Date('2026-09-01T00:00:00Z'),
        tutor: {
          id: overrides.tutorId ?? tutorUserId,
          name: overrides.tutorName ?? 'Ada Lovelace',
          tutorProfile: overrides.tutorProfile ?? {
            photoUrl: null,
            location: 'Bole',
            serviceAreas: ['Bole'],
            teachingModes: ['IN_PERSON'],
            hourlyRate: 400,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            subjects: [
              { id: 's1', tutorProfileId: 'profile-1', subject: 'Physics', academicLevels: ['Grade 9', 'Grade 10'] },
            ],
          },
        },
      };
    }

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates recommended matches for a ranked set of eligible tutors', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([
        { ...eligibleTutorProfile, hourlyRate: 400 },
        {
          ...eligibleTutorProfile,
          id: 'profile-2',
          userId: 'tutor-2',
          user: { id: 'tutor-2', name: 'Grace Hopper', status: 'ACTIVE' },
          subjects: [
            { id: 's2', tutorProfileId: 'profile-2', subject: 'Physics', academicLevels: ['Grade 9', 'Grade 10'] },
          ],
        },
      ]);
      prisma.match.findMany.mockImplementation((args?: { include?: boolean }) => {
        if (args?.include) {
          return Promise.resolve([
            buildMatchRecord({ tutorId: 'tutor-1' }),
            buildMatchRecord({ tutorId: 'tutor-2', tutorName: 'Grace Hopper' }),
          ]);
        }
        return Promise.resolve([]);
      });
      prisma.match.create.mockImplementation((args: { data: { tutorId: string } }) =>
        Promise.resolve(buildMatchRecord({ tutorId: args.data.tutorId })),
      );

      const result = await service.generateMatches(ownerId, UserRoleName.CLIENT, requestId);

      expect(prisma.match.create).toHaveBeenCalledTimes(2);
      expect(result.matches).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.matches[0]).toEqual(
        expect.objectContaining({
          score: expect.any(Number),
          matchReasons: expect.any(Array),
          status: MatchStatus.RECOMMENDED,
        }),
      );
      expect(result.matches[0].tutor).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          subjects: ['Physics'],
          levels: ['Grade 9', 'Grade 10'],
        }),
      );
    });

    it('does not duplicate existing RECOMMENDED matches on re-run', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([{ ...eligibleTutorProfile, hourlyRate: 400 }]);

      prisma.match.findMany.mockImplementation((args?: { include?: boolean }) => {
        if (args?.include) {
          return Promise.resolve([buildMatchRecord()]);
        }
        return Promise.resolve([
          { tutorId: tutorUserId, status: MatchStatus.RECOMMENDED },
        ]);
      });

      const result = await service.generateMatches(ownerId, UserRoleName.CLIENT, requestId);

      expect(prisma.match.create).not.toHaveBeenCalled();
      expect(prisma.match.update).toHaveBeenCalledTimes(1);
      expect(result.count).toBe(1);
    });

    it('preserves SELECTED and DECLINED matches while refreshing the rest', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([{ ...eligibleTutorProfile, hourlyRate: 400 }]);

      prisma.match.findMany.mockImplementation((args?: { include?: boolean }) => {
        if (args?.include) {
          return Promise.resolve([buildMatchRecord()]);
        }
        return Promise.resolve([
          { tutorId: tutorUserId, status: MatchStatus.SELECTED },
        ]);
      });

      await service.generateMatches(ownerId, UserRoleName.CLIENT, requestId);

      expect(prisma.match.create).not.toHaveBeenCalled();
      expect(prisma.match.update).not.toHaveBeenCalled();
    });

    it('expires stale RECOMMENDED matches that are no longer ranked', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([{ ...eligibleTutorProfile, hourlyRate: 400 }]);

      const staleOtherTutor = 'tutor-stale';
      prisma.match.findMany.mockImplementation((args?: { include?: boolean }) => {
        if (args?.include) {
          return Promise.resolve([buildMatchRecord()]);
        }
        return Promise.resolve([
          { tutorId: tutorUserId, status: MatchStatus.RECOMMENDED },
          { tutorId: staleOtherTutor, status: MatchStatus.RECOMMENDED },
        ]);
      });
      prisma.match.update.mockImplementation((args: { where: { tutorRequestId_tutorId: { tutorId: string } }; data: object }) =>
        Promise.resolve(buildMatchRecord({ tutorId: args.where.tutorRequestId_tutorId.tutorId })),
      );

      await service.generateMatches(ownerId, UserRoleName.CLIENT, requestId);

      expect(prisma.match.update).toHaveBeenCalledTimes(2);
      const expiredUpdate = prisma.match.update.mock.calls.find(
        (call) => call[0].where.tutorRequestId_tutorId.tutorId === staleOtherTutor,
      );
      expect(expiredUpdate?.[0].data).toEqual(
        expect.objectContaining({ status: MatchStatus.EXPIRED }),
      );
    });

    it('returns a useful message when there are no eligible tutors', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([]);
      prisma.match.findMany.mockResolvedValue([]);

      const result = await service.generateMatches(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.count).toBe(0);
      expect(result.matches).toEqual([]);
      expect(result.message).toBeDefined();
    });

    it('notes when nothing clears the minimum recommendation threshold', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([{ ...eligibleTutorProfile, hourlyRate: 400 }]);
      prisma.match.findMany.mockResolvedValue([]);

      const spy = jest
        .spyOn(scoringService, 'calculateCompatibility')
        .mockReturnValue({
          totalScore: 40,
          factorScores: {
            subject: 100,
            availability: 100,
            academicLevel: 100,
            locationMode: 100,
            experience: 20,
            budget: 100,
            reliability: 40,
            preferences: 100,
          },
          reasons: [],
        });

      const result = await service.generateMatches(ownerId, UserRoleName.CLIENT, requestId);

      spy.mockRestore();

      expect(result.matches).toEqual([]);
      expect(result.message).toMatch(/minimum|recommendation/i);
    });

    it('respects the default result limit', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      const manyProfiles = Array.from({ length: 15 }, (_, index) => ({
        ...eligibleTutorProfile,
        id: `profile-${index}`,
        userId: `tutor-${index}`,
        user: { id: `tutor-${index}`, name: `Tutor ${index}`, status: 'ACTIVE' },
      }));
      prisma.tutorProfile.findMany.mockResolvedValue(manyProfiles);
      prisma.match.findMany.mockImplementation((args?: { include?: boolean }) => {
        if (args?.include) {
          return Promise.resolve(
            Array.from({ length: 10 }, (_, index) =>
              buildMatchRecord({ tutorId: `tutor-${index}` }),
            ),
          );
        }
        return Promise.resolve([]);
      });
      prisma.match.create.mockImplementation((args: { data: { tutorId: string } }) =>
        Promise.resolve(buildMatchRecord({ tutorId: args.data.tutorId })),
      );

      const result = await service.generateMatches(ownerId, UserRoleName.CLIENT, requestId);

      expect(prisma.match.create).toHaveBeenCalledTimes(10);
      expect(result.matches).toHaveLength(10);
    });

    it('forbids a different client from generating matches', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);

      await expect(
        service.generateMatches(otherClientId, UserRoleName.CLIENT, requestId),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('allows staff coordinators to generate matches', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.tutorProfile.findMany.mockResolvedValue([{ ...eligibleTutorProfile, hourlyRate: 400 }]);
      prisma.match.findMany.mockImplementation((args?: { include?: boolean }) => {
        if (args?.include) {
          return Promise.resolve([buildMatchRecord()]);
        }
        return Promise.resolve([]);
      });
      prisma.match.create.mockImplementation((args: { data: { tutorId: string } }) =>
        Promise.resolve(buildMatchRecord({ tutorId: args.data.tutorId })),
      );

      const result = await service.generateMatches(
        'coordinator-1',
        UserRoleName.COORDINATOR,
        requestId,
      );

      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('listMatches', () => {
    function buildMatchRecord(overrides: Record<string, unknown> = {}) {
      return {
        id: 'match-1',
        tutorRequestId: requestId,
        tutorId: tutorUserId,
        score: 92,
        factorScores: {
          subject: 100,
          availability: 100,
          academicLevel: 100,
          locationMode: 100,
          experience: 80,
          budget: 100,
          reliability: 80,
          preferences: 100,
        },
        matchReasons: ['Matches the requested subject', 'Available at the requested time'],
        status: MatchStatus.RECOMMENDED,
        createdAt: new Date('2026-09-01T00:00:00Z'),
        updatedAt: new Date('2026-09-01T00:00:00Z'),
        tutor: {
          id: tutorUserId,
          name: 'Ada Lovelace',
          tutorProfile: {
            photoUrl: null,
            location: 'Bole',
            serviceAreas: ['Bole'],
            teachingModes: ['IN_PERSON'],
            hourlyRate: 400,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            subjects: [
              { id: 's1', tutorProfileId: 'profile-1', subject: 'Physics', academicLevels: ['Grade 9', 'Grade 10'] },
            ],
          },
        },
        ...overrides,
      };
    }

    it('returns existing matches ranked by score', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      // Simulates the DB applying `orderBy: [{ score: 'desc' }]`.
      prisma.match.findMany.mockResolvedValue([
        buildMatchRecord({ id: 'high', score: 95, tutorId: 'tutor-high' }),
        buildMatchRecord({ id: 'low', score: 60, tutorId: 'tutor-low' }),
      ]);

      const result = await service.listMatches(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.count).toBe(2);
      expect(result.matches[0].score).toBe(95);
      expect(result.matches[1].score).toBe(60);
      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ score: 'desc' }, { tutorRequestId: 'asc' }],
        }),
      );
      expect(result.matches[0].tutor).toEqual(
        expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
      );
    });

    it('returns an empty list when no matches exist', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.match.findMany.mockResolvedValue([]);

      const result = await service.listMatches(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.count).toBe(0);
      expect(result.matches).toEqual([]);
    });

    it('does not expose private tutor contact or rate information', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);
      prisma.match.findMany.mockResolvedValue([buildMatchRecord()]);

      const result = await service.listMatches(ownerId, UserRoleName.CLIENT, requestId);

      expect(result.matches[0].tutor).not.toHaveProperty('email');
      expect(result.matches[0].tutor).not.toHaveProperty('phone');
    });

    it('forbids a different client from listing matches', async () => {
      prisma.tutorRequest.findUnique.mockResolvedValue(requestRecord);

      await expect(
        service.listMatches(otherClientId, UserRoleName.CLIENT, requestId),
      ).rejects.toMatchObject({ status: 403 });
    });
  });
});