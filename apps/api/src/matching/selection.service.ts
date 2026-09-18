import { HttpStatus, Injectable } from '@nestjs/common';
import { MatchStatus, OpportunityStatus, Prisma } from '@prisma/client';
import { ApiException } from '../common/api.exception';
import { PrismaService } from '../prisma/prisma.service';

type OpportunityWithRelations = Prisma.TutorOpportunityGetPayload<{
  include: {
    match: {
      select: {
        id: true;
        score: true;
        matchReasons: true;
        factorScores: true;
      };
    };
    tutorRequest: {
      select: {
        id: true;
        subjects: true;
        academicLevels: true;
        teachingModes: true;
        location: true;
        serviceArea: true;
        notes: true;
        schedule: true;
      };
    };
  };
}>;

const SELECTABLE_STATUSES: MatchStatus[] = [
  MatchStatus.RECOMMENDED,
  MatchStatus.VIEWED,
];

const OPPORTUNITY_TERMINAL_STATUSES: OpportunityStatus[] = [
  OpportunityStatus.ACCEPTED,
  OpportunityStatus.DECLINED,
  OpportunityStatus.EXPIRED,
  OpportunityStatus.CANCELLED,
];

@Injectable()
export class SelectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Client selects a match. Atomically:
   *  1. Validates ownership, match selectability, tutor activity.
   *  2. Ensures no other match for this request is already SELECTED.
   *  3. Sets the match status to SELECTED.
   *  4. Creates a TutorOpportunity (idempotent – returns existing if already created).
   */
  async selectMatch(clientUserId: string, matchId: string) {
    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          tutorRequest: { select: { id: true, userId: true, status: true } },
          tutor: {
            select: {
              id: true,
              status: true,
              tutorProfile: { select: { status: true } },
            },
          },
          opportunity: true,
        },
      });

      if (!match) {
        throw new ApiException(HttpStatus.NOT_FOUND, {
          code: 'NOT_FOUND',
          message: 'Match not found',
        });
      }

      if (match.tutorRequest.userId !== clientUserId) {
        throw new ApiException(HttpStatus.FORBIDDEN, {
          code: 'FORBIDDEN',
          message: 'You do not have access to this match',
        });
      }

      if (!SELECTABLE_STATUSES.includes(match.status)) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: 'VALIDATION_FAILED',
          message: `Match cannot be selected in its current status: ${match.status}`,
        });
      }

      if (match.tutor.status !== 'ACTIVE') {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: 'VALIDATION_FAILED',
          message: 'Tutor is no longer active',
        });
      }

      if (!match.tutor.tutorProfile || match.tutor.tutorProfile.status !== 'ACTIVE') {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: 'VALIDATION_FAILED',
          message: 'Tutor profile is not active',
        });
      }

      // Ensure no other match for this request is already selected
      const alreadySelected = await tx.match.findFirst({
        where: {
          tutorRequestId: match.tutorRequest.id,
          status: MatchStatus.SELECTED,
          id: { not: matchId },
        },
        select: { id: true },
      });

      if (alreadySelected) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: 'VALIDATION_FAILED',
          message: 'A tutor has already been selected for this request',
        });
      }

      // Mark match as SELECTED
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: { status: MatchStatus.SELECTED },
      });

      // Idempotent: create opportunity only if it doesn't exist yet
      let opportunity = match.opportunity;
      if (!opportunity) {
        opportunity = await tx.tutorOpportunity.create({
          data: {
            matchId,
            tutorId: match.tutorId,
            tutorRequestId: match.tutorRequest.id,
            status: OpportunityStatus.PENDING,
          },
        });
      }

      return {
        matchId: updatedMatch.id,
        status: updatedMatch.status,
        opportunityId: opportunity.id,
        opportunityStatus: opportunity.status,
      };
    });
  }

  /**
   * Lists all opportunities for the authenticated tutor.
   */
  async listOpportunities(tutorUserId: string) {
    const opportunities = await this.prisma.tutorOpportunity.findMany({
      where: { tutorId: tutorUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        match: {
          select: {
            id: true,
            score: true,
            matchReasons: true,
            factorScores: true,
          },
        },
        tutorRequest: {
          select: {
            id: true,
            subjects: true,
            academicLevels: true,
            teachingModes: true,
            location: true,
            serviceArea: true,
            notes: true,
            schedule: true,
          },
        },
      },
    });

    return {
      opportunities: opportunities.map((opp) => this.serializeOpportunity(opp)),
      count: opportunities.length,
    };
  }

  /**
   * Gets a single opportunity for the authenticated tutor.
   */
  async getOpportunity(tutorUserId: string, opportunityId: string) {
    const opportunity = await this.findOwnedOpportunity(tutorUserId, opportunityId);
    return this.serializeOpportunity(opportunity);
  }

  /**
   * Tutor accepts an opportunity.
   */
  async acceptOpportunity(tutorUserId: string, opportunityId: string) {
    return this.respondToOpportunity(tutorUserId, opportunityId, OpportunityStatus.ACCEPTED);
  }

  /**
   * Tutor declines an opportunity.
   */
  async declineOpportunity(tutorUserId: string, opportunityId: string) {
    return this.respondToOpportunity(tutorUserId, opportunityId, OpportunityStatus.DECLINED);
  }

  private async respondToOpportunity(
    tutorUserId: string,
    opportunityId: string,
    newStatus: 'ACCEPTED' | 'DECLINED',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const opportunity = await tx.tutorOpportunity.findUnique({
        where: { id: opportunityId },
        select: { id: true, tutorId: true, status: true },
      });

      if (!opportunity) {
        throw new ApiException(HttpStatus.NOT_FOUND, {
          code: 'NOT_FOUND',
          message: 'Opportunity not found',
        });
      }

      if (opportunity.tutorId !== tutorUserId) {
        throw new ApiException(HttpStatus.FORBIDDEN, {
          code: 'FORBIDDEN',
          message: 'You do not have access to this opportunity',
        });
      }

      if (OPPORTUNITY_TERMINAL_STATUSES.includes(opportunity.status)) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: 'VALIDATION_FAILED',
          message: `Opportunity cannot be updated in its current status: ${opportunity.status}`,
        });
      }

      const updated = await tx.tutorOpportunity.update({
        where: { id: opportunityId },
        data: { status: newStatus, respondedAt: new Date() },
      });

      return {
        opportunityId: updated.id,
        status: updated.status,
        respondedAt: updated.respondedAt,
      };
    });
  }

  private async findOwnedOpportunity(
    tutorUserId: string,
    opportunityId: string,
  ): Promise<OpportunityWithRelations> {
    const opportunity = await this.prisma.tutorOpportunity.findUnique({
      where: { id: opportunityId },
      include: {
        match: {
          select: {
            id: true,
            score: true,
            matchReasons: true,
            factorScores: true,
          },
        },
        tutorRequest: {
          select: {
            id: true,
            subjects: true,
            academicLevels: true,
            teachingModes: true,
            location: true,
            serviceArea: true,
            notes: true,
            schedule: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: 'NOT_FOUND',
        message: 'Opportunity not found',
      });
    }

    if (opportunity.tutorId !== tutorUserId) {
      throw new ApiException(HttpStatus.FORBIDDEN, {
        code: 'FORBIDDEN',
        message: 'You do not have access to this opportunity',
      });
    }

    return opportunity;
  }

  private serializeOpportunity(opp: OpportunityWithRelations) {
    return {
      id: opp.id,
      status: opp.status,
      respondedAt: opp.respondedAt,
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt,
      match: {
        id: opp.match.id,
        score: opp.match.score,
        matchReasons: opp.match.matchReasons,
      },
      request: {
        id: opp.tutorRequest.id,
        subjects: opp.tutorRequest.subjects,
        academicLevels: opp.tutorRequest.academicLevels,
        teachingModes: opp.tutorRequest.teachingModes,
        location: opp.tutorRequest.location,
        serviceArea: opp.tutorRequest.serviceArea,
        notes: opp.tutorRequest.notes,
        schedule: opp.tutorRequest.schedule,
      },
    };
  }
}
