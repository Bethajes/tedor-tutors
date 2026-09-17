import type { DayOfWeek, TeachingMode } from '@prisma/client';
import type { ScoringFactorName } from './scoring.config';

export interface RequestScheduleSlot {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface ScoreRequest {
  subjects: string[];
  academicLevels: string[];
  teachingModes: TeachingMode[];
  serviceArea: string | null;
  location: string | null;
  schedule: RequestScheduleSlot[];
  prefersInPerson: boolean;
  budget: number | null;
  preferredLanguage: string | null;
}

export interface ScoreCandidateSubject {
  subject: string;
  academicLevels: string[];
}

export interface ScoreCandidateAvailability {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface ScoreCandidate {
  subjects: ScoreCandidateSubject[];
  teachingModes: TeachingMode[];
  serviceAreas: string[];
  location: string | null;
  availability: ScoreCandidateAvailability[];
  hourlyRate: number | null;
  languages: string[];
  profileCreatedAt: Date | null;
  experienceYears: number | null;
  rating: number | null;
  completedSessions: number | null;
}

export type FactorScores = Record<ScoringFactorName, number>;

export interface CompatibilityResult {
  totalScore: number;
  factorScores: FactorScores;
  reasons: string[];
}