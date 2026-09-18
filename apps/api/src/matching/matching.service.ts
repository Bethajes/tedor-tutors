import { HttpStatus, Injectable } from '@nestjs/common';
import { MatchStatus, Prisma, RequestStatus, UserRoleName } from '@prisma/client';
import { ApiException } from '../common/api.exception';
import { PrismaService } from '../prisma/prisma.service';
import { EligibilityService, type EligibilityRequest, type TutorCandidate } from './eligibility.service';
import { ScoringService } from './scoring/scoring.service';
import type { CompatibilityResult, FactorScores, ScoreCandidate, ScoreRequest } from './scoring/scoring.types';
import { MATCHING_CONFIG } from './matching.config';
import { selectRecommended } from './ranking';

type TutorProfileWithRelations = Prisma.TutorProfileGetPayload<{
  include: {
    user: { select: { id: true; name: true; status: true } };
    subjects: true;
    availability: true;
  };
}>;

type TutorRequestWithSchedule = Prisma.TutorRequestGetPayload<{
  include: { schedule: true };
}>;

type MatchWithTutor = Prisma.MatchGetPayload<{
  include: {
    tutor: {
      select: {
        id: true;
        name: true;
        status: true;
        tutorProfile: {
          select: {
            photoUrl: true;
            location: true;
            serviceAreas: true;
            teachingModes: true;
            hourlyRate: true;
            status: true;
            createdAt: true;
            subjects: true;
          };
        };
      };
    };
  };
}>;

interface ScoredCandidate {
  profile: TutorProfileWithRelations;
  result: CompatibilityResult;
}

interface TutorPreview {
  id: string;
  name: string;
  photo: string | null;
  subjects: string[];
  levels: string[];
  experience: number | null;
  rating: number | null;
  teachingModes: string[];
  serviceAreas: string[];
  location: string | null;
  hourlyRate: number | null;
  currency: string | null;
}

interface SerializedMatch {
  id: string;
  tutor: TutorPreview;
  score: number;
  factorScores: FactorScores;
  matchReasons: string[];
  status: MatchStatus;
}

export interface MatchResults {
  matches: SerializedMatch[];
  count: number;
  message?: string;
  request?: {
    id: string;
    status: string;
    ready: boolean;
    subjects: string[];
    academicLevels: string[];
    teachingModes: string[];
  };
}

const STAFF_ROLES: UserRoleName[] = [
  UserRoleName.COORDINATOR,
  UserRoleName.ADMIN,
  UserRoleName.SUPER_ADMIN,
];

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: EligibilityService,
    private readonly scoring: ScoringService,
  ) {}

  async findEligibleTutors(userId: string, userRole: UserRoleName, tutorRequestId: string) {
    const tutorRequest = await this.loadAuthorizedRequest(userId, userRole, tutorRequestId);
    this.assertRequestReady(tutorRequest);
    const scored = await this.findScoredEligible(tutorRequest);

    return {
      tutors: scored.map(({ profile, result }) => ({
        ...this.serializeTutor(profile),
        score: result,
      })),
      count: scored.length,
    };
  }

  async getTutorRequest(userId: string, userRole: UserRoleName, tutorRequestId: string) {
    const tutorRequest = await this.loadAuthorizedRequest(userId, userRole, tutorRequestId);

    return {
      id: tutorRequest.id,
      status: tutorRequest.status,
      subjects: tutorRequest.subjects,
      academicLevels: tutorRequest.academicLevels,
      teachingModes: tutorRequest.teachingModes,
      location: tutorRequest.location,
      serviceArea: tutorRequest.serviceArea,
      notes: tutorRequest.notes,
      schedule: tutorRequest.schedule.map((slot) => ({
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
      ready: this.isRequestReady(tutorRequest),
      createdAt: tutorRequest.createdAt,
      updatedAt: tutorRequest.updatedAt,
    };
  }

  async generateMatches(
    userId: string,
    userRole: UserRoleName,
    tutorRequestId: string,
    limit: number = MATCHING_CONFIG.DEFAULT_MATCH_LIMIT,
  ): Promise<MatchResults> {
    const tutorRequest = await this.loadAuthorizedRequest(userId, userRole, tutorRequestId);
    this.assertRequestReady(tutorRequest);
    const scored = await this.findScoredEligible(tutorRequest);

    const ranked = scored.map(({ profile, result }) => ({
      tutorId: profile.user.id,
      name: profile.user.name,
      totalScore: result.totalScore,
      factorScores: result.factorScores,
      reasons: result.reasons,
    }));

    const safeLimit = this.resultLimit(limit);
    const recommended = selectRecommended(ranked, safeLimit);
    await this.persistMatches(tutorRequestId, recommended);

    const matches = await this.fetchMatches(tutorRequestId);

    const result: MatchResults = {
      matches: matches.map((match) => this.serializeMatch(match)),
      count: matches.length,
    };

    if (scored.length === 0) {
      return { ...result, message: 'No eligible tutors found for this request.' };
    }

    if (recommended.length === 0) {
      return {
        ...result,
        message: 'No matches met the minimum recommendation score.',
      };
    }

    return result;
  }

  async listMatches(
    userId: string,
    userRole: UserRoleName,
    tutorRequestId: string,
  ): Promise<MatchResults> {
    const tutorRequest = await this.loadAuthorizedRequest(userId, userRole, tutorRequestId);
    const ready = this.isRequestReady(tutorRequest);

    const requestInfo = {
      id: tutorRequest.id,
      status: tutorRequest.status,
      ready,
      subjects: tutorRequest.subjects,
      academicLevels: tutorRequest.academicLevels,
      teachingModes: tutorRequest.teachingModes,
    };

    if (!ready) {
      return {
        matches: [],
        count: 0,
        request: requestInfo,
        message: 'Complete your tutor request before viewing matches.',
      };
    }

    let matches = await this.fetchMatches(tutorRequestId);

    if (matches.length === 0) {
      try {
        await this.generateMatches(userId, userRole, tutorRequestId);
        matches = await this.fetchMatches(tutorRequestId);
      } catch {
        // If on-demand generation fails (e.g. transient eligibility issue),
        // return an empty list rather than breaking the view. The client can
        // explicitly POST /matches to surface the error.
        matches = [];
      }
    }

    return {
      matches: matches.map((match) => this.serializeMatch(match)),
      count: matches.length,
      request: requestInfo,
    };
  }

  private async loadAuthorizedRequest(
    userId: string,
    userRole: UserRoleName,
    tutorRequestId: string,
  ): Promise<TutorRequestWithSchedule> {
    const tutorRequest = await this.prisma.tutorRequest.findUnique({
      where: { id: tutorRequestId },
      include: { schedule: true },
    });

    if (!tutorRequest) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: 'NOT_FOUND',
        message: 'Tutor request not found',
      });
    }

    if (
      !STAFF_ROLES.includes(userRole) &&
      (userRole !== UserRoleName.CLIENT || tutorRequest.userId !== userId)
    ) {
      throw new ApiException(HttpStatus.FORBIDDEN, {
        code: 'FORBIDDEN',
        message: 'You do not have access to this tutor request',
      });
    }

    return tutorRequest;
  }

  private isRequestReady(request: TutorRequestWithSchedule): boolean {
    return (
      request.status !== RequestStatus.CANCELLED &&
      request.status !== RequestStatus.COMPLETED &&
      request.subjects.length > 0 &&
      request.subjects.every((subject) => subject.trim().length > 0) &&
      request.academicLevels.length > 0 &&
      request.academicLevels.every((level) => level.trim().length > 0) &&
      request.teachingModes.length > 0
    );
  }

  private assertRequestReady(request: TutorRequestWithSchedule): void {
    if (!this.isRequestReady(request)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: 'Tutor request is not ready for matching',
      });
    }
  }

  private resultLimit(limit: number): number {
    return Number.isInteger(limit) && limit > 0 && limit <= MATCHING_CONFIG.MAX_RESULT_LIMIT
      ? limit
      : MATCHING_CONFIG.DEFAULT_MATCH_LIMIT;
  }

  private async findScoredEligible(
    tutorRequest: TutorRequestWithSchedule,
  ): Promise<ScoredCandidate[]> {
    const request: EligibilityRequest = {
      subjects: tutorRequest.subjects,
      academicLevels: tutorRequest.academicLevels,
      teachingModes: tutorRequest.teachingModes,
      serviceArea: tutorRequest.serviceArea,
      location: tutorRequest.location,
      schedule: tutorRequest.schedule.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    };

    const scoreRequest = this.toScoreRequest(tutorRequest);

    const candidates = await this.prisma.tutorProfile.findMany({
      where: { user: { status: 'ACTIVE' } },
      include: {
        user: { select: { id: true, name: true, status: true } },
        subjects: true,
        availability: true,
      },
    });

    return candidates
      .filter((candidate) => this.eligibility.isEligible(request, this.toCandidate(candidate)))
      .map((candidate) => ({
        profile: candidate,
        result: this.scoring.calculateCompatibility(
          scoreRequest,
          this.toScoreCandidate(candidate),
        ),
      }));
  }

  private async persistMatches(
    requestId: string,
    recommended: ReturnType<typeof selectRecommended>,
  ): Promise<ReturnType<typeof selectRecommended>> {
    if (recommended.length === 0) {
      await this.expireStaleMatches(requestId, new Set());
      return recommended;
    }

    const existing = await this.prisma.match.findMany({
      where: { tutorRequestId: requestId },
      select: { tutorId: true, status: true },
    });
    const existingByTutor = new Map(existing.map((match) => [match.tutorId, match.status]));
    const allTutorIds = new Set([...existingByTutor.keys(), ...recommended.map((r) => r.tutorId)]);

    const operations: Prisma.PrismaPromise<unknown>[] = [];

    for (const candidate of recommended) {
      const data = {
        score: candidate.totalScore,
        factorScores: candidate.factorScores as Prisma.InputJsonValue,
        matchReasons: candidate.reasons as Prisma.InputJsonValue,
      };
      const current = existingByTutor.get(candidate.tutorId);

      if (!current) {
        operations.push(
          this.prisma.match.create({
            data: {
              tutorRequestId: requestId,
              tutorId: candidate.tutorId,
              ...data,
              status: MatchStatus.RECOMMENDED,
            },
          }),
        );
      } else if (current === MatchStatus.RECOMMENDED || current === MatchStatus.EXPIRED) {
        operations.push(
          this.prisma.match.update({
            where: { tutorRequestId_tutorId: { tutorRequestId: requestId, tutorId: candidate.tutorId } },
            data: { ...data, status: MatchStatus.RECOMMENDED },
          }),
        );
      } else if (current === MatchStatus.VIEWED) {
        operations.push(
          this.prisma.match.update({
            where: { tutorRequestId_tutorId: { tutorRequestId: requestId, tutorId: candidate.tutorId } },
            data,
          }),
        );
      }
    }

    for (const candidate of recommended) {
      allTutorIds.delete(candidate.tutorId);
    }

    for (const tutorId of allTutorIds) {
      const status = existingByTutor.get(tutorId);
      if (status === MatchStatus.RECOMMENDED || status === MatchStatus.VIEWED) {
        operations.push(
          this.prisma.match.update({
            where: { tutorRequestId_tutorId: { tutorRequestId: requestId, tutorId } },
            data: { status: MatchStatus.EXPIRED },
          }),
        );
      }
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }

    return recommended;
  }

  private async expireStaleMatches(requestId: string, activeTutorIds: Set<string>) {
    const existing = await this.prisma.match.findMany({
      where: { tutorRequestId: requestId },
      select: { tutorId: true, status: true },
    });

    const operations: Prisma.PrismaPromise<unknown>[] = [];
    for (const match of existing) {
      if (
        (match.status === MatchStatus.RECOMMENDED || match.status === MatchStatus.VIEWED) &&
        !activeTutorIds.has(match.tutorId)
      ) {
        operations.push(
          this.prisma.match.update({
            where: { tutorRequestId_tutorId: { tutorRequestId: requestId, tutorId: match.tutorId } },
            data: { status: MatchStatus.EXPIRED },
          }),
        );
      }
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }
  }

  private async fetchMatches(requestId: string): Promise<MatchWithTutor[]> {
    return this.prisma.match.findMany({
      where: { tutorRequestId: requestId },
      orderBy: [{ score: 'desc' }, { tutorRequestId: 'asc' }],
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            status: true,
            tutorProfile: {
              select: {
                photoUrl: true,
                location: true,
                serviceAreas: true,
                teachingModes: true,
                hourlyRate: true,
                status: true,
                createdAt: true,
                subjects: true,
              },
            },
          },
        },
      },
    });
  }

  private serializeMatch(match: MatchWithTutor): SerializedMatch {
    const profile = match.tutor.tutorProfile;
    return {
      id: match.id,
      tutor: {
        id: match.tutor.id,
        name: match.tutor.name,
        photo: profile?.photoUrl ?? null,
        subjects: Array.from(new Set((profile?.subjects ?? []).map((subject) => subject.subject))),
        levels: Array.from(
          new Set((profile?.subjects ?? []).flatMap((subject) => subject.academicLevels)),
        ),
        experience: profile ? this.experienceYears(profile.createdAt) : null,
        rating: null,
        teachingModes: profile?.teachingModes ?? [],
        serviceAreas: profile?.serviceAreas ?? [],
        location: profile?.location ?? null,
        hourlyRate: profile?.hourlyRate ?? null,
        currency: null,
      },
      score: match.score,
      factorScores: match.factorScores as unknown as FactorScores,
      matchReasons: match.matchReasons as string[],
      status: match.status,
    };
  }

  private experienceYears(createdAt: Date): number {
    const months = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    return Math.max(0, Math.floor(months / 12));
  }

  private toScoreRequest(tutorRequest: TutorRequestWithSchedule): ScoreRequest {
    return {
      subjects: tutorRequest.subjects,
      academicLevels: tutorRequest.academicLevels,
      teachingModes: tutorRequest.teachingModes,
      serviceArea: tutorRequest.serviceArea,
      location: tutorRequest.location,
      schedule: tutorRequest.schedule.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
      prefersInPerson:
        tutorRequest.teachingModes.includes('IN_PERSON') ||
        tutorRequest.teachingModes.includes('BOTH'),
      budget: null,
      preferredLanguage: null,
    };
  }

  private toScoreCandidate(profile: TutorProfileWithRelations): ScoreCandidate {
    return {
      subjects: profile.subjects.map((subject) => ({
        subject: subject.subject,
        academicLevels: subject.academicLevels,
      })),
      teachingModes: profile.teachingModes,
      serviceAreas: profile.serviceAreas,
      location: profile.location,
      availability: profile.availability.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
      hourlyRate: profile.hourlyRate,
      languages: [],
      profileCreatedAt: profile.createdAt,
      experienceYears: null,
      rating: null,
      completedSessions: null,
    };
  }

  private toCandidate(profile: TutorProfileWithRelations): TutorCandidate {
    return {
      accountStatus: profile.user.status,
      profileStatus: profile.status,
      subjects: profile.subjects.map((subject) => ({
        subject: subject.subject,
        academicLevels: subject.academicLevels,
      })),
      teachingModes: profile.teachingModes,
      serviceAreas: profile.serviceAreas,
      location: profile.location,
      availability: profile.availability.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    };
  }

  private serializeTutor(profile: TutorProfileWithRelations) {
    const subjectNames = Array.from(
      new Set(profile.subjects.map((subject) => subject.subject)),
    );
    const academicLevels = Array.from(
      new Set(profile.subjects.flatMap((subject) => subject.academicLevels)),
    );
    return {
      id: profile.user.id,
      name: profile.user.name,
      subjects: subjectNames,
      levels: academicLevels,
      teachingModes: profile.teachingModes,
      serviceAreas: profile.serviceAreas,
    };
  }
}