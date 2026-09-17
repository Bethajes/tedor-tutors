import { Injectable } from '@nestjs/common';
import { DayOfWeek, TeachingMode } from '@prisma/client';

export interface RequestScheduleSlot {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface TutorCandidateSubject {
  subject: string;
  academicLevels: string[];
}

export interface TutorCandidateAvailability {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface TutorCandidate {
  accountStatus: string;
  profileStatus: string;
  subjects: TutorCandidateSubject[];
  teachingModes: TeachingMode[];
  serviceAreas: string[];
  location: string | null;
  availability: TutorCandidateAvailability[];
}

export interface EligibilityRequest {
  subjects: string[];
  academicLevels: string[];
  teachingModes: TeachingMode[];
  serviceArea: string | null;
  location: string | null;
  schedule: RequestScheduleSlot[];
}

const ACTIVE = 'ACTIVE';

function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function expandModes(modes: TeachingMode[]): Set<TeachingMode> {
  const expanded = new Set<TeachingMode>();
  for (const mode of modes) {
    if (mode === TeachingMode.BOTH) {
      expanded.add(TeachingMode.IN_PERSON);
      expanded.add(TeachingMode.ONLINE);
    } else {
      expanded.add(mode);
    }
  }
  return expanded;
}

@Injectable()
export class EligibilityService {
  isEligible(request: EligibilityRequest, candidate: TutorCandidate): boolean {
    return (
      this.accountIsActive(candidate) &&
      this.profileIsActive(candidate) &&
      this.matchesSubject(request, candidate) &&
      this.matchesAcademicLevel(request, candidate) &&
      this.matchesTeachingMode(request, candidate) &&
      this.matchesLocation(request, candidate) &&
      this.matchesAvailability(request, candidate)
    );
  }

  accountIsActive(candidate: TutorCandidate): boolean {
    return candidate.accountStatus === ACTIVE;
  }

  profileIsActive(candidate: TutorCandidate): boolean {
    return candidate.profileStatus === ACTIVE;
  }

  matchesSubject(request: EligibilityRequest, candidate: TutorCandidate): boolean {
    return request.subjects.every((subject) =>
      candidate.subjects.some((entry) => entry.subject === subject),
    );
  }

  matchesAcademicLevel(request: EligibilityRequest, candidate: TutorCandidate): boolean {
    if (request.academicLevels.length === 0) return true;
    return request.subjects.every((requiredSubject) => {
      const levelsForSubject = candidate.subjects
        .filter((entry) => entry.subject === requiredSubject)
        .flatMap((entry) => entry.academicLevels);
      return request.academicLevels.every((level) => levelsForSubject.includes(level));
    });
  }

  matchesTeachingMode(request: EligibilityRequest, candidate: TutorCandidate): boolean {
    const requested = expandModes(request.teachingModes);
    const offered = expandModes(candidate.teachingModes);
    for (const mode of requested) {
      if (offered.has(mode)) return true;
    }
    return false;
  }

  requiresInPerson(request: EligibilityRequest): boolean {
    return expandModes(request.teachingModes).has(TeachingMode.IN_PERSON);
  }

  matchesLocation(request: EligibilityRequest, candidate: TutorCandidate): boolean {
    if (!this.requiresInPerson(request)) return true;
    const requestedArea = request.serviceArea ?? request.location;
    if (requestedArea === null || requestedArea.trim() === '') return true;
    if (candidate.serviceAreas.includes(requestedArea)) return true;
    return candidate.location !== null && this.normalize(candidate.location) === this.normalize(requestedArea);
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }

  matchesAvailability(request: EligibilityRequest, candidate: TutorCandidate): boolean {
    if (request.schedule.length === 0) return true;
    return request.schedule.every((slot) =>
      candidate.availability.some((available) => this.slotCovered(slot, available)),
    );
  }

  private slotCovered(
    requested: RequestScheduleSlot,
    available: TutorCandidateAvailability,
  ): boolean {
    if (requested.dayOfWeek !== available.dayOfWeek) return false;
    const requestedStart = toMinutes(requested.startTime);
    const requestedEnd = toMinutes(requested.endTime);
    const availableStart = toMinutes(available.startTime);
    const availableEnd = toMinutes(available.endTime);
    if (requestedStart === null || requestedEnd === null) return false;
    if (availableStart === null || availableEnd === null) return false;
    if (requestedStart >= requestedEnd) return false;
    return availableStart <= requestedStart && requestedEnd <= availableEnd;
  }
}