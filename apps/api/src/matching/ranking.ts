import type { FactorScores } from './scoring/scoring.types';
import { MATCHING_CONFIG } from './matching.config';

export interface RankableCandidate {
  tutorId: string;
  name: string;
  totalScore: number;
  factorScores: FactorScores;
  reasons: string[];
}

export function compareRankable(a: RankableCandidate, b: RankableCandidate): number {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;

  if (b.factorScores.availability !== a.factorScores.availability) {
    return b.factorScores.availability - a.factorScores.availability;
  }

  if (b.factorScores.reliability !== a.factorScores.reliability) {
    return b.factorScores.reliability - a.factorScores.reliability;
  }

  if (b.factorScores.experience !== a.factorScores.experience) {
    return b.factorScores.experience - a.factorScores.experience;
  }

  if (a.name !== b.name) return a.name.localeCompare(b.name);

  return a.tutorId.localeCompare(b.tutorId);
}

export function rankCandidates<T extends RankableCandidate>(candidates: T[]): T[] {
  return [...candidates].sort(compareRankable);
}

/**
 * Keeps only candidates at or above the minimum recommended score and caps the
 * result at `limit`. The full eligible set is computed upstream; this only
 * narrows what gets persisted as an active recommendation.
 */
export function selectRecommended<T extends RankableCandidate>(
  candidates: T[],
  limit: number = MATCHING_CONFIG.DEFAULT_MATCH_LIMIT,
): T[] {
  return rankCandidates(candidates)
    .filter((candidate) => candidate.totalScore >= MATCHING_CONFIG.MIN_RECOMMENDED_SCORE)
    .slice(0, limit);
}