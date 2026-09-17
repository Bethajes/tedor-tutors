import { DayOfWeek, TeachingMode } from '@prisma/client';
import { SCORING_WEIGHTS, SCORING_WEIGHT_SUM } from './scoring.config';
import { ScoringService } from './scoring.service';
import type { ScoreCandidate, ScoreRequest } from './scoring.types';

describe('ScoringService', () => {
  let service: ScoringService;

  const baseRequest: ScoreRequest = {
    subjects: ['Physics'],
    academicLevels: ['Grade 10'],
    teachingModes: [TeachingMode.IN_PERSON],
    serviceArea: 'Bole',
    location: 'Addis Ababa',
    schedule: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '15:00', endTime: '17:00' }],
    prefersInPerson: true,
    budget: 500,
    preferredLanguage: 'English',
  };

  const perfectCandidate: ScoreCandidate = {
    subjects: [{ subject: 'Physics', academicLevels: ['Grade 9', 'Grade 10', 'Grade 11'] }],
    teachingModes: [TeachingMode.IN_PERSON],
    serviceAreas: ['Bole', 'Cazanchise'],
    location: 'Bole',
    availability: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '18:00' }],
    hourlyRate: 400,
    languages: ['English', 'Amharic'],
    profileCreatedAt: null,
    experienceYears: 10,
    rating: 5,
    completedSessions: 120,
  };

  beforeEach(() => {
    service = new ScoringService();
  });

  describe('weight configuration', () => {
    it('defines the eight documented factors', () => {
      expect(Object.keys(SCORING_WEIGHTS)).toEqual([
        'subject',
        'availability',
        'academicLevel',
        'locationMode',
        'experience',
        'budget',
        'reliability',
        'preferences',
      ]);
    });

    it('assigns the documented weights', () => {
      expect(SCORING_WEIGHTS).toEqual({
        subject: 0.25,
        availability: 0.2,
        academicLevel: 0.15,
        locationMode: 0.1,
        experience: 0.1,
        budget: 0.1,
        reliability: 0.05,
        preferences: 0.05,
      });
    });

    it('weights total exactly 100%', () => {
      expect(SCORING_WEIGHT_SUM).toBeCloseTo(1, 10);
    });
  });

  describe('perfect match', () => {
    it('scores every factor at 100 and the total at 100', () => {
      const result = service.calculateCompatibility(baseRequest, perfectCandidate);

      expect(result.factorScores).toEqual({
        subject: 100,
        availability: 100,
        academicLevel: 100,
        locationMode: 100,
        experience: 100,
        budget: 100,
        reliability: 100,
        preferences: 100,
      });
      expect(result.totalScore).toBe(100);
    });

    it('produces a rich set of positive reasons', () => {
      const result = service.calculateCompatibility(baseRequest, perfectCandidate);

      expect(result.reasons).toEqual(
        expect.arrayContaining([
          'Matches the requested subject',
          'Available at the requested time',
          'Experienced with Grade 10 students',
          'Provides in-person tutoring in the requested area',
          'Experienced tutor',
          'Within the client\'s budget',
          'Consistently reliable tutor',
          'Supports the requested language (English)',
        ]),
      );
    });
  });

  describe('strong match', () => {
    it('produces a high but not perfect total', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        subjects: [
          { subject: 'Physics', academicLevels: ['Grade 10', 'Grade 11'] },
          { subject: 'Chemistry', academicLevels: ['Grade 10'] },
        ],
        serviceAreas: ['Cazanchise'],
        location: 'Bole',
        availability: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '14:00', endTime: '16:00' }],
        hourlyRate: 450,
        languages: ['Amharic'],
        experienceYears: 2,
        rating: 4,
        completedSessions: 60,
      };

      const result = service.calculateCompatibility(baseRequest, candidate);

      const expectedFactors = {
        subject: 100,
        availability: 50,
        academicLevel: 100,
        locationMode: 90,
        experience: 67,
        budget: 100,
        reliability: 80,
        preferences: 40,
      };
      expect(result.factorScores).toEqual(expectedFactors);
      expect(result.totalScore).toBeLessThan(100);
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('correct weighted calculation', () => {
    it('computes the total as the weighted sum of the rounded factors', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        subjects: [
          { subject: 'Physics', academicLevels: ['Grade 10'] },
          { subject: 'Chemistry', academicLevels: ['Grade 10'] },
        ],
        experienceYears: 5,
        rating: 4,
        completedSessions: 40,
        languages: ['English'],
        hourlyRate: 400,
      };

      const result = service.calculateCompatibility(baseRequest, candidate);

      const expectedTotal = Math.round(
        result.factorScores.subject * SCORING_WEIGHTS.subject +
          result.factorScores.availability * SCORING_WEIGHTS.availability +
          result.factorScores.academicLevel * SCORING_WEIGHTS.academicLevel +
          result.factorScores.locationMode * SCORING_WEIGHTS.locationMode +
          result.factorScores.experience * SCORING_WEIGHTS.experience +
          result.factorScores.budget * SCORING_WEIGHTS.budget +
          result.factorScores.reliability * SCORING_WEIGHTS.reliability +
          result.factorScores.preferences * SCORING_WEIGHTS.preferences,
      );

      expect(result.totalScore).toBe(expectedTotal);
    });

    it('produces the documented example total from the documented example factors', () => {
      const exampleFactors = {
        subject: 100,
        availability: 90,
        academicLevel: 100,
        locationMode: 80,
        experience: 70,
        budget: 100,
        reliability: 90,
        preferences: 80,
      };
      const total = Object.entries(exampleFactors).reduce(
        (sum, [factor, score]) => sum + score * SCORING_WEIGHTS[factor as keyof typeof SCORING_WEIGHTS],
        0,
      );
      expect(Math.abs(total - 91.5)).toBeCloseTo(0, 5);
      expect(Math.round(total)).toBe(92);
    });
  });

  describe('subject scoring', () => {
    it('scores 100 when all requested subjects are taught', () => {
      expect(service.subjectScore(baseRequest, perfectCandidate)).toBe(100);
    });

    it('scores proportionally for partial subject coverage', () => {
      const request: ScoreRequest = {
        ...baseRequest,
        subjects: ['Physics', 'Chemistry', 'Biology'],
      };
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        subjects: [{ subject: 'Physics', academicLevels: ['Grade 10'] }],
      };
      expect(service.subjectScore(request, candidate)).toBe(33);
    });

    it('scores 0 when no requested subject is taught', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        subjects: [{ subject: 'Biology', academicLevels: ['Grade 10'] }],
      };
      expect(service.subjectScore(baseRequest, candidate)).toBe(0);
    });
  });

  describe('availability scoring', () => {
    it('scores 100 when every requested slot is fully covered', () => {
      expect(service.availabilityScore(baseRequest, perfectCandidate)).toBe(100);
    });

    it('scores partial coverage proportionally', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        availability: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '14:00', endTime: '16:00' }],
      };
      expect(service.availabilityScore(baseRequest, candidate)).toBe(50);
    });

    it('scores proportionally across multiple requested slots', () => {
      const request: ScoreRequest = {
        ...baseRequest,
        schedule: [
          { dayOfWeek: DayOfWeek.MONDAY, startTime: '15:00', endTime: '17:00' },
          { dayOfWeek: DayOfWeek.TUESDAY, startTime: '10:00', endTime: '12:00' },
        ],
      };
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        availability: [
          { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '18:00' },
          { dayOfWeek: DayOfWeek.TUESDAY, startTime: '10:00', endTime: '11:00' },
        ],
      };
      expect(service.availabilityScore(request, candidate)).toBe(75);
    });

    it('scores 0 when there is no overlap', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        availability: [{ dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '09:00', endTime: '18:00' }],
      };
      expect(service.availabilityScore(baseRequest, candidate)).toBe(0);
    });

    it('scores 100 when the request has no schedule constraint', () => {
      const request: ScoreRequest = { ...baseRequest, schedule: [] };
      const candidate: ScoreCandidate = { ...perfectCandidate, availability: [] };
      expect(service.availabilityScore(request, candidate)).toBe(100);
    });
  });

  describe('academic level scoring', () => {
    it('scores 100 when all requested levels are covered', () => {
      expect(service.academicLevelScore(baseRequest, perfectCandidate)).toBe(100);
    });

    it('scores proportionally for partial level coverage', () => {
      const request: ScoreRequest = {
        ...baseRequest,
        academicLevels: ['Grade 9', 'Grade 10', 'Grade 11'],
      };
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        subjects: [{ subject: 'Physics', academicLevels: ['Grade 10'] }],
      };
      expect(service.academicLevelScore(request, candidate)).toBe(33);
    });

    it('scores 0 when the required level is not offered', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        subjects: [{ subject: 'Physics', academicLevels: ['Grade 12', 'University'] }],
      };
      expect(service.academicLevelScore(baseRequest, candidate)).toBe(0);
    });

    it('scores 100 when no levels are constrained', () => {
      const request: ScoreRequest = { ...baseRequest, academicLevels: [] };
      expect(service.academicLevelScore(request, perfectCandidate)).toBe(100);
    });
  });

  describe('location and mode scoring', () => {
    it('scores 100 for an exact service area match', () => {
      expect(service.locationModeScore(baseRequest, perfectCandidate)).toBe(100);
    });

    it('scores 90 when the tutor location equals the requested location but the service area differs', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        serviceAreas: ['Cazanchise'],
        location: 'Bole',
      };
      expect(service.locationModeScore(baseRequest, candidate)).toBe(90);
    });

    it('scores 75 for an in-person request when the location does not match but mode is exact', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        serviceAreas: ['Yeka'],
        location: 'Yeka',
      };
      // mode alignment 100 + location quality 50, averaged
      expect(service.locationModeScore(baseRequest, candidate)).toBe(75);
    });

    it('ignores location entirely for online-only requests', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        serviceAreas: [],
        location: null,
        teachingModes: [TeachingMode.ONLINE],
      };
      const request: ScoreRequest = {
        ...baseRequest,
        teachingModes: [TeachingMode.ONLINE],
        prefersInPerson: false,
      };
      expect(service.locationModeScore(request, candidate)).toBe(100);
    });

    it('rewards tutors offering both modes against a single-mode request', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        teachingModes: [TeachingMode.BOTH],
      };
      // In-person request: mode alignment = 90 (tutor offers more), location = 100
      expect(service.locationModeScore(baseRequest, candidate)).toBe(95);
    });
  });

  describe('experience scoring', () => {
    it('scores 100 for a tutor with many years of experience', () => {
      const candidate: ScoreCandidate = { ...perfectCandidate, experienceYears: 10 };
      expect(service.experienceScore(candidate)).toBe(100);
    });

    it('scores proportionally for a tutor with a few years of experience', () => {
      const candidate: ScoreCandidate = { ...perfectCandidate, experienceYears: 2 };
      expect(service.experienceScore(candidate)).toBe(67);
    });

    it('returns a higher score for more experienced tutors', () => {
      const junior: ScoreCandidate = { ...perfectCandidate, experienceYears: 1 };
      const senior: ScoreCandidate = { ...perfectCandidate, experienceYears: 5 };
      expect(service.experienceScore(senior)).toBeGreaterThan(service.experienceScore(junior));
    });

    it('falls back to a neutral score when the experience is unverifiable', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        experienceYears: null,
        profileCreatedAt: null,
      };
      expect(service.experienceScore(candidate)).toBe(50);
    });

    it('derives experience from profile age when experience years are absent', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-09-15T00:00:00Z'));
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        experienceYears: null,
        profileCreatedAt: new Date('2025-09-15T00:00:00Z'),
      };
      // Exactly 12 months ago -> 12/36 of the max -> 33
      expect(service.experienceScore(candidate)).toBe(33);
      jest.useRealTimers();
    });
  });

  describe('budget scoring', () => {
    it('scores 100 when the hourly rate is within budget', () => {
      expect(service.budgetScore(baseRequest, perfectCandidate)).toBe(100);
    });

    it('penalizes a price above the preferred budget', () => {
      const candidate: ScoreCandidate = { ...perfectCandidate, hourlyRate: 600 };
      // 20% over budget -> penalty 10 points -> 90
      expect(service.budgetScore(baseRequest, candidate)).toBe(90);
    });

    it('keeps the penalty below the configured maximum', () => {
      const candidate: ScoreCandidate = { ...perfectCandidate, hourlyRate: 1000 };
      // 100% over budget -> capped penalty 50 -> 50
      expect(service.budgetScore(baseRequest, candidate)).toBe(50);
    });

    it('scores 100 when no budget was stated', () => {
      const request: ScoreRequest = { ...baseRequest, budget: null };
      expect(service.budgetScore(request, perfectCandidate)).toBe(100);
    });

    it('returns a neutral score when the rate is unknown', () => {
      const candidate: ScoreCandidate = { ...perfectCandidate, hourlyRate: null };
      expect(service.budgetScore(baseRequest, candidate)).toBe(75);
    });

    it('adds a weakness reason when the price exceeds the budget', () => {
      const candidate: ScoreCandidate = { ...perfectCandidate, hourlyRate: 600 };
      const result = service.calculateCompatibility(baseRequest, candidate);
      expect(result.reasons).toContain('Price is above the preferred budget');
    });
  });

  describe('reliability scoring', () => {
    it('scores from a rating', () => {
      const candidate: ScoreCandidate = { ...perfectCandidate, rating: 4 };
      expect(service.reliabilityScore(candidate)).toBe(80);
    });

    it('scores from completed sessions when no rating is available', () => {
      const candidate: ScoreCandidate = { ...perfectCandidate, rating: null, completedSessions: 50 };
      expect(service.reliabilityScore(candidate)).toBe(100);
    });

    it('falls back to neutral when no reliability data exists', () => {
      const candidate: ScoreCandidate = {
        ...perfectCandidate,
        rating: null,
        completedSessions: null,
      };
      expect(service.reliabilityScore(candidate)).toBe(50);
    });
  });

  describe('language and preference scoring', () => {
    it('scores 100 when the tutor supports the preferred language', () => {
      expect(service.preferencesScore(baseRequest, perfectCandidate)).toBe(100);
    });

    it('scores 40 when the tutor language set does not include the preference', () => {
      const candidate: ScoreCandidate = { ...perfectCandidate, languages: ['Amharic'] };
      expect(service.preferencesScore(baseRequest, candidate)).toBe(40);
    });

    it('scores 50 when the tutor language set is unknown', () => {
      const candidate: ScoreCandidate = { ...perfectCandidate, languages: [] };
      expect(service.preferencesScore(baseRequest, candidate)).toBe(50);
    });

    it('scores 100 when no language is preferred', () => {
      const request: ScoreRequest = { ...baseRequest, preferredLanguage: null };
      expect(service.preferencesScore(request, perfectCandidate)).toBe(100);
    });
  });

  describe('multiple factors changing the final score', () => {
    it('moves the total by exactly the weight of a changed factor', () => {
      const highReliability = service.calculateCompatibility({
        ...baseRequest,
        budget: null,
        teachingModes: [TeachingMode.ONLINE],
        serviceArea: null,
        location: null,
        schedule: [],
        preferredLanguage: null,
      }, {
        ...perfectCandidate,
        teachingModes: [TeachingMode.ONLINE],
        rating: 5,
        experienceYears: 10,
        languages: [],
      });

      const lowReliability = service.calculateCompatibility({
        ...baseRequest,
        budget: null,
        teachingModes: [TeachingMode.ONLINE],
        serviceArea: null,
        location: null,
        schedule: [],
        preferredLanguage: null,
      }, {
        ...perfectCandidate,
        teachingModes: [TeachingMode.ONLINE],
        rating: 2,
        experienceYears: 10,
        languages: [],
      });

      // Ratings 5 (100) vs 2 (40): a 60-point swing on a 5% factor = 3 points.
      expect(highReliability.totalScore - lowReliability.totalScore).toBe(3);
    });

    it('remains deterministic across calls', () => {
      const first = service.calculateCompatibility(baseRequest, perfectCandidate);
      const second = service.calculateCompatibility(baseRequest, perfectCandidate);
      expect(first).toEqual(second);
    });
  });

  describe('missing optional information', () => {
    it('handles a candidate with no optional profile data predictably', () => {
      const candidate: ScoreCandidate = {
        subjects: [{ subject: 'Physics', academicLevels: ['Grade 10'] }],
        teachingModes: [TeachingMode.IN_PERSON],
        serviceAreas: ['Bole'],
        location: 'Bole',
        availability: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '18:00' }],
        hourlyRate: null,
        languages: [],
        profileCreatedAt: null,
        experienceYears: null,
        rating: null,
        completedSessions: null,
      };

      const result = service.calculateCompatibility(baseRequest, candidate);

      expect(result.factorScores.experience).toBe(50);
      expect(result.factorScores.reliability).toBe(50);
      expect(result.factorScores.preferences).toBe(50);
      expect(result.reasons).toContain('Experience information is not available');
    });
  });

  describe('score bounds', () => {
    it('never exceeds 100 for a maximal candidate', () => {
      expect(service.calculateCompatibility(baseRequest, perfectCandidate).totalScore).toBe(100);
    });

    it('is always between 0 and 100 across several candidates', () => {
      const candidates: ScoreCandidate[] = [
        perfectCandidate,
        { ...perfectCandidate, subjects: [], availability: [], languages: [], hourlyRate: 5000, rating: 0, experienceYears: 0 },
        { ...perfectCandidate, teachingModes: [TeachingMode.ONLINE], serviceAreas: [], location: null },
        {
          subjects: [],
          teachingModes: [],
          serviceAreas: [],
          location: null,
          availability: [],
          hourlyRate: null,
          languages: [],
          profileCreatedAt: null,
          experienceYears: null,
          rating: null,
          completedSessions: null,
        },
      ];
      for (const candidate of candidates) {
        const { totalScore, factorScores } = service.calculateCompatibility(baseRequest, candidate);
        expect(totalScore).toBeGreaterThanOrEqual(0);
        expect(totalScore).toBeLessThanOrEqual(100);
        for (const score of Object.values(factorScores)) {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      }
    });

    it('keeps a single factor from exceeding its maximum contribution', () => {
      const result = service.calculateCompatibility(baseRequest, perfectCandidate);
      expect(result.totalScore).toBe(100);
      for (const score of Object.values(result.factorScores)) {
        expect(score).toBeLessThanOrEqual(100);
      }
    });
  });
});