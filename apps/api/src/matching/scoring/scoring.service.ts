import { Injectable } from '@nestjs/common';
import { TeachingMode } from '@prisma/client';
import {
  BUDGET_CONFIG,
  EXPERIENCE_CONFIG,
  PREFERENCE_CONFIG,
  RELIABILITY_CONFIG,
  SCORING_WEIGHTS,
  type ScoringFactorName,
} from './scoring.config';
import type {
  CompatibilityResult,
  FactorScores,
  ScoreCandidate,
  ScoreRequest,
} from './scoring.types';

function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
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

export const FACTOR_POSITIVE_THRESHOLD = 80;
export const FACTOR_NEGATIVE_THRESHOLD = 60;

@Injectable()
export class ScoringService {
  calculateCompatibility(request: ScoreRequest, candidate: ScoreCandidate): CompatibilityResult {
    const factorScores: FactorScores = {
      subject: this.subjectScore(request, candidate),
      availability: this.availabilityScore(request, candidate),
      academicLevel: this.academicLevelScore(request, candidate),
      locationMode: this.locationModeScore(request, candidate),
      experience: this.experienceScore(candidate),
      budget: this.budgetScore(request, candidate),
      reliability: this.reliabilityScore(candidate),
      preferences: this.preferencesScore(request, candidate),
    };

    const weightedSum = (Object.keys(SCORING_WEIGHTS) as ScoringFactorName[]).reduce(
      (sum, factor) => sum + factorScores[factor] * SCORING_WEIGHTS[factor],
      0,
    );

    return {
      totalScore: Math.round(clamp(weightedSum)),
      factorScores,
      reasons: this.buildReasons(request, candidate, factorScores),
    };
  }

  subjectScore(request: ScoreRequest, candidate: ScoreCandidate): number {
    if (request.subjects.length === 0) return 100;
    const matched = request.subjects.filter((subject) =>
      candidate.subjects.some((entry) => entry.subject === subject),
    ).length;
    return Math.round(clamp((matched / request.subjects.length) * 100));
  }

  availabilityScore(request: ScoreRequest, candidate: ScoreCandidate): number {
    if (request.schedule.length === 0) return 100;
    const coverageRatios = request.schedule.map((slot) => {
      let bestCoverage = 0;
      for (const available of candidate.availability) {
        if (slot.dayOfWeek !== available.dayOfWeek) continue;
        const requestedStart = toMinutes(slot.startTime);
        const requestedEnd = toMinutes(slot.endTime);
        const availableStart = toMinutes(available.startTime);
        const availableEnd = toMinutes(available.endTime);
        if (requestedStart === null || requestedEnd === null) continue;
        if (availableStart === null || availableEnd === null) continue;
        const requestedDuration = requestedEnd - requestedStart;
        if (requestedDuration <= 0) continue;
        const overlap = Math.min(requestedEnd, availableEnd) - Math.max(requestedStart, availableStart);
        const ratio = Math.max(0, overlap) / requestedDuration;
        bestCoverage = Math.max(bestCoverage, ratio);
      }
      return bestCoverage;
    });
    const averageCoverage =
      coverageRatios.reduce((sum, ratio) => sum + ratio, 0) / coverageRatios.length;
    return Math.round(clamp(averageCoverage * 100));
  }

  academicLevelScore(request: ScoreRequest, candidate: ScoreCandidate): number {
    if (request.academicLevels.length === 0) return 100;
    const coveredRatios = request.subjects.map((requiredSubject) => {
      const levelsForSubject = candidate.subjects
        .filter((entry) => entry.subject === requiredSubject)
        .flatMap((entry) => entry.academicLevels);
      const covered = request.academicLevels.filter((level) =>
        levelsForSubject.includes(level),
      ).length;
      return covered / request.academicLevels.length;
    });
    if (coveredRatios.length === 0) return 0;
    const averageCoverage =
      coveredRatios.reduce((sum, ratio) => sum + ratio, 0) / coveredRatios.length;
    return Math.round(clamp(averageCoverage * 100));
  }

  locationModeScore(request: ScoreRequest, candidate: ScoreCandidate): number {
    const modeScore = this.modeAlignmentScore(request, candidate);
    if (!request.prefersInPerson) return Math.round(clamp(modeScore));

    const locationScore = this.locationQualityScore(request, candidate);
    return Math.round(clamp((modeScore + locationScore) / 2));
  }

  private modeAlignmentScore(request: ScoreRequest, candidate: ScoreCandidate): number {
    const requested = expandModes(request.teachingModes);
    const offered = expandModes(candidate.teachingModes);

    let matchesRequested = true;
    for (const mode of requested) {
      if (!offered.has(mode)) {
        matchesRequested = false;
        break;
      }
    }
    if (!matchesRequested) return 0;

    const same = requested.size === offered.size;
    if (same) return 100;
    let requestedBeyond = false;
    for (const mode of offered) {
      if (!requested.has(mode)) {
        requestedBeyond = true;
        break;
      }
    }
    if (requestedBeyond) return 90;
    return 60;
  }

  private locationQualityScore(request: ScoreRequest, candidate: ScoreCandidate): number {
    const requestedArea = request.serviceArea ?? request.location;
    if (requestedArea === null || requestedArea.trim() === '') return 100;
    if (candidate.serviceAreas.includes(requestedArea)) return 100;
    if (candidate.location !== null && this.normalize(candidate.location) === this.normalize(requestedArea)) {
      return 80;
    }
    return 50;
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }

  experienceScore(candidate: ScoreCandidate): number {
    let months = 0;
    if (candidate.experienceYears !== null && candidate.experienceYears > 0) {
      months = candidate.experienceYears * 12;
    } else if (candidate.profileCreatedAt !== null) {
      months = this.monthsSince(candidate.profileCreatedAt);
    }
    if (months <= 0) return EXPERIENCE_CONFIG.fallbackScore;
    return Math.round(clamp((months / EXPERIENCE_CONFIG.maxMonthsForFullScore) * 100));
  }

  private monthsSince(date: Date): number {
    const now = new Date();
    const months = (now.getFullYear() - date.getFullYear()) * 12;
    return months + (now.getMonth() - date.getMonth());
  }

  budgetScore(request: ScoreRequest, candidate: ScoreCandidate): number {
    if (request.budget === null) return BUDGET_CONFIG.noBudgetScore;
    if (candidate.hourlyRate === null) return Math.round(clamp((BUDGET_CONFIG.noBudgetScore + EXPERIENCE_CONFIG.fallbackScore) / 2));
    if (candidate.hourlyRate <= request.budget) return 100;
    const overPercent = ((candidate.hourlyRate - request.budget) / request.budget) * 100;
    const penalty = overPercent * BUDGET_CONFIG.overBudgetPenaltyPerPercent;
    return Math.round(clamp(100 - Math.min(penalty, BUDGET_CONFIG.maxPenalty)));
  }

  reliabilityScore(candidate: ScoreCandidate): number {
    if (candidate.rating !== null) {
      return Math.round(clamp((candidate.rating / 5) * 100));
    }
    if (candidate.completedSessions !== null && candidate.completedSessions > 0) {
      return Math.round(clamp(Math.min(candidate.completedSessions / 50, 1) * 100));
    }
    return RELIABILITY_CONFIG.fallbackScore;
  }

  preferencesScore(request: ScoreRequest, candidate: ScoreCandidate): number {
    if (request.preferredLanguage === null || request.preferredLanguage.trim() === '') {
      return 100;
    }
    const requested = request.preferredLanguage.trim().toLowerCase();
    if (candidate.languages.some((language) => language.trim().toLowerCase() === requested)) {
      return 100;
    }
    if (candidate.languages.length === 0) return PREFERENCE_CONFIG.fallbackScore;
    return 40;
  }

  buildReasons(
    request: ScoreRequest,
    candidate: ScoreCandidate,
    factorScores: FactorScores,
  ): string[] {
    const reasons: string[] = [];

    if (factorScores.subject >= FACTOR_POSITIVE_THRESHOLD) {
      reasons.push('Matches the requested subject');
    }

    if (factorScores.availability >= FACTOR_POSITIVE_THRESHOLD) {
      reasons.push('Available at the requested time');
    } else if (factorScores.availability >= FACTOR_NEGATIVE_THRESHOLD) {
      reasons.push('Limited availability overlap');
    } else if (factorScores.availability < FACTOR_NEGATIVE_THRESHOLD) {
      reasons.push('Availability does not cover the full requested schedule');
    }

    if (factorScores.academicLevel >= FACTOR_POSITIVE_THRESHOLD) {
      const levels = request.academicLevels.slice(0, 2).join(' and ');
      reasons.push(levels ? `Experienced with ${levels} students` : 'Experienced across the requested levels');
    } else if (factorScores.academicLevel < FACTOR_NEGATIVE_THRESHOLD) {
      reasons.push('May need to accommodate some requested academic levels');
    }

    if (request.prefersInPerson && factorScores.locationMode >= FACTOR_POSITIVE_THRESHOLD) {
      reasons.push('Provides in-person tutoring in the requested area');
    } else if (factorScores.locationMode < FACTOR_NEGATIVE_THRESHOLD) {
      reasons.push('Teaching mode flexibility is limited');
    }

    if (factorScores.experience >= FACTOR_POSITIVE_THRESHOLD) {
      reasons.push('Experienced tutor');
    } else if (candidate.experienceYears === null && candidate.profileCreatedAt === null) {
      reasons.push('Experience information is not available');
    }

    if (request.budget !== null && candidate.hourlyRate !== null && candidate.hourlyRate > request.budget) {
      reasons.push('Price is above the preferred budget');
    } else if (factorScores.budget >= FACTOR_POSITIVE_THRESHOLD) {
      reasons.push('Within the client\'s budget');
    }

    if (factorScores.reliability >= FACTOR_POSITIVE_THRESHOLD) {
      reasons.push('Consistently reliable tutor');
    }

    if (request.preferredLanguage !== null && request.preferredLanguage.trim() !== '') {
      if (factorScores.preferences >= FACTOR_POSITIVE_THRESHOLD) {
        reasons.push(`Supports the requested language (${request.preferredLanguage})`);
      } else {
        reasons.push('Language preference is not matched');
      }
    }

    return reasons;
  }
}