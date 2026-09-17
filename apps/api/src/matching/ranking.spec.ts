import type { FactorScores } from './scoring/scoring.types';
import { MATCHING_CONFIG } from './matching.config';
import {
  compareRankable,
  rankCandidates,
  selectRecommended,
  type RankableCandidate,
} from './ranking';

function candidate(overrides: Partial<RankableCandidate> = {}): RankableCandidate {
  return {
    tutorId: 'tutor-1',
    name: 'Ada Lovelace',
    totalScore: 80,
    reasons: [],
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
    ...overrides,
  };
}

const emptyFactorScores = (): FactorScores => ({
  subject: 0,
  availability: 0,
  academicLevel: 0,
  locationMode: 0,
  experience: 0,
  budget: 0,
  reliability: 0,
  preferences: 0,
});

describe('ranking', () => {
  describe('compareRankable', () => {
    it('orders by total score descending', () => {
      const higher = candidate({ tutorId: 'a', totalScore: 90 });
      const lower = candidate({ tutorId: 'b', totalScore: 70 });

      expect(compareRankable(higher, lower)).toBeLessThan(0);
      expect(compareRankable(lower, higher)).toBeGreaterThan(0);
    });

    it('breaks score ties by availability factor', () => {
      const moreAvailable = candidate({ tutorId: 'a', factorScores: { ...emptyFactorScores(), availability: 90 } });
      const lessAvailable = candidate({ tutorId: 'b', factorScores: { ...emptyFactorScores(), availability: 80 } });

      expect(compareRankable(moreAvailable, lessAvailable)).toBeLessThan(0);
    });

    it('breaks availability ties by reliability factor', () => {
      const moreReliable = candidate({
        tutorId: 'a',
        factorScores: { ...emptyFactorScores(), availability: 90, reliability: 85 },
      });
      const lessReliable = candidate({
        tutorId: 'b',
        factorScores: { ...emptyFactorScores(), availability: 90, reliability: 75 },
      });

      expect(compareRankable(moreReliable, lessReliable)).toBeLessThan(0);
    });

    it('breaks reliability ties by experience factor', () => {
      const moreExperienced = candidate({
        tutorId: 'a',
        factorScores: { ...emptyFactorScores(), availability: 90, reliability: 85, experience: 80 },
      });
      const lessExperienced = candidate({
        tutorId: 'b',
        factorScores: { ...emptyFactorScores(), availability: 90, reliability: 85, experience: 60 },
      });

      expect(compareRankable(moreExperienced, lessExperienced)).toBeLessThan(0);
    });

    it('falls back to name ascending for identical scores', () => {
      const adam = candidate({ tutorId: 'a', name: 'Adam' });
      const beau = candidate({ tutorId: 'b', name: 'Beau' });

      expect(compareRankable(adam, beau)).toBeLessThan(0);
    });

    it('uses tutor id as the final deterministic tiebreaker', () => {
      const a = candidate({ tutorId: 'b-tutor', name: 'Same Name' });
      const b = candidate({ tutorId: 'a-tutor', name: 'Same Name' });

      expect(compareRankable(a, b)).toBeGreaterThan(0);
      expect(compareRankable(b, a)).toBeLessThan(0);
    });

    it('is a strict total order on equal candidates', () => {
      const a = candidate({ tutorId: 't-1' });
      const b = candidate({ tutorId: 't-1' });

      expect(compareRankable(a, b)).toBe(0);
    });
  });

  describe('rankCandidates', () => {
    it('returns a new sorted array without mutating the input', () => {
      const low = candidate({ tutorId: 'low', totalScore: 10 });
      const high = candidate({ tutorId: 'high', totalScore: 90 });
      const input = [low, high];

      const result = rankCandidates(input);

      expect(input[0]).toBe(low);
      expect(result.map((c) => c.tutorId)).toEqual(['high', 'low']);
    });

    it('places the highest-scoring tutor first', () => {
      const result = rankCandidates([
        candidate({ tutorId: 'c', totalScore: 65 }),
        candidate({ tutorId: 'a', totalScore: 95 }),
        candidate({ tutorId: 'b', totalScore: 85 }),
      ]);

      expect(result.map((c) => c.tutorId)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('selectRecommended', () => {
    it('drops candidates below the minimum recommended score', () => {
      const result = selectRecommended([
        candidate({ tutorId: 'good', totalScore: 90 }),
        candidate({ tutorId: 'poor', totalScore: MATCHING_CONFIG.MIN_RECOMMENDED_SCORE - 1 }),
      ]);

      expect(result.map((c) => c.tutorId)).toEqual(['good']);
    });

    it('keeps candidates exactly at the minimum score', () => {
      const result = selectRecommended([
        candidate({ tutorId: 'ok', totalScore: MATCHING_CONFIG.MIN_RECOMMENDED_SCORE }),
      ]);

      expect(result.map((c) => c.tutorId)).toEqual(['ok']);
    });

    it('caps the result at the configured limit', () => {
      const many = Array.from({ length: 25 }, (_, index) =>
        candidate({ tutorId: `t${index}`, totalScore: 100 - index }),
      );

      const result = selectRecommended(many, 10);

      expect(result).toHaveLength(10);
    });

    it('returns matches in ranked order (highest first)', () => {
      const result = selectRecommended([
        candidate({ tutorId: 'low', totalScore: 70 }),
        candidate({ tutorId: 'high', totalScore: 99 }),
        candidate({ tutorId: 'mid', totalScore: 85 }),
      ]);

      expect(result.map((c) => c.tutorId)).toEqual(['high', 'mid', 'low']);
    });

    it('returns an empty list when nothing qualifies', () => {
      const result = selectRecommended([
        candidate({ tutorId: 'low', totalScore: 30 }),
      ]);

      expect(result).toEqual([]);
    });
  });
});