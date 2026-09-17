import { DayOfWeek, TeachingMode } from '@prisma/client';
import { EligibilityService, type EligibilityRequest, type TutorCandidate } from './eligibility.service';

describe('EligibilityService', () => {
  let service: EligibilityService;

  const baseRequest: EligibilityRequest = {
    subjects: ['Physics'],
    academicLevels: ['Grade 10'],
    teachingModes: [TeachingMode.IN_PERSON],
    serviceArea: 'Bole',
    location: 'Addis Ababa',
    schedule: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '15:00', endTime: '17:00' }],
  };

  const matchingCandidate: TutorCandidate = {
    accountStatus: 'ACTIVE',
    profileStatus: 'ACTIVE',
    subjects: [
      { subject: 'Physics', academicLevels: ['Grade 9', 'Grade 10', 'Grade 11'] },
      { subject: 'Chemistry', academicLevels: ['Grade 10'] },
    ],
    teachingModes: [TeachingMode.IN_PERSON, TeachingMode.ONLINE],
    serviceAreas: ['Bole', 'Cazanchise'],
    location: 'Bole',
    availability: [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: DayOfWeek.TUESDAY, startTime: '09:00', endTime: '12:00' },
    ],
  };

  beforeEach(() => {
    service = new EligibilityService();
  });

  describe('subject matching', () => {
    it('accepts a tutor teaching the required subject', () => {
      expect(service.matchesSubject(baseRequest, matchingCandidate)).toBe(true);
    });

    it('rejects a tutor that does not teach the required subject', () => {
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        subjects: [{ subject: 'Biology', academicLevels: ['Grade 10'] }],
      };
      expect(service.matchesSubject(baseRequest, candidate)).toBe(false);
    });

    it('rejects a tutor missing one of several required subjects', () => {
      const request: EligibilityRequest = {
        ...baseRequest,
        subjects: ['Physics', 'Chemistry'],
      };
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        subjects: [{ subject: 'Physics', academicLevels: ['Grade 10'] }],
      };
      expect(service.matchesSubject(request, candidate)).toBe(false);
    });
  });

  describe('academic level matching', () => {
    it('accepts a tutor covering the required level', () => {
      expect(service.matchesAcademicLevel(baseRequest, matchingCandidate)).toBe(true);
    });

    it('rejects a tutor that does not cover the required level', () => {
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        subjects: [{ subject: 'Physics', academicLevels: ['Grade 12', 'University'] }],
      };
      expect(service.matchesAcademicLevel(baseRequest, candidate)).toBe(false);
    });

    it('accepts when the request has no level constraint', () => {
      const request: EligibilityRequest = { ...baseRequest, academicLevels: [] };
      expect(service.matchesAcademicLevel(request, matchingCandidate)).toBe(true);
    });

    it('aggregates levels across multiple entries for the same subject', () => {
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        subjects: [
          { subject: 'Physics', academicLevels: ['Grade 9'] },
          { subject: 'Physics', academicLevels: ['Grade 10'] },
        ],
      };
      expect(service.matchesAcademicLevel(baseRequest, candidate)).toBe(true);
    });
  });

  describe('teaching mode matching', () => {
    it('accepts a tutor supporting one of the requested modes', () => {
      expect(service.matchesTeachingMode(baseRequest, matchingCandidate)).toBe(true);
    });

    it('rejects a tutor with disjoint modes', () => {
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        teachingModes: [TeachingMode.ONLINE],
      };
      const request: EligibilityRequest = {
        ...baseRequest,
        teachingModes: [TeachingMode.IN_PERSON],
      };
      expect(service.matchesTeachingMode(request, candidate)).toBe(false);
    });

    it('accepts a BOTH tutor against a single-mode request', () => {
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        teachingModes: [TeachingMode.BOTH],
      };
      expect(service.matchesTeachingMode(baseRequest, candidate)).toBe(true);
    });

    it('accepts a single-mode tutor against a BOTH request', () => {
      const request: EligibilityRequest = {
        ...baseRequest,
        teachingModes: [TeachingMode.BOTH],
      };
      expect(service.matchesTeachingMode(request, matchingCandidate)).toBe(true);
    });
  });

  describe('location matching', () => {
    it('accepts a tutor covering the requested service area', () => {
      expect(service.matchesLocation(baseRequest, matchingCandidate)).toBe(true);
    });

    it('rejects a tutor outside the requested service area', () => {
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        serviceAreas: ['Yeka', 'Nifas Silk'],
        location: 'Yeka',
      };
      expect(service.matchesLocation(baseRequest, candidate)).toBe(false);
    });

    it('accepts a tutor whose location equals the requested location', () => {
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        serviceAreas: [],
        location: 'Bole',
      };
      expect(service.matchesLocation(baseRequest, candidate)).toBe(true);
    });

    it('skips the location check for online-only requests', () => {
      const request: EligibilityRequest = {
        ...baseRequest,
        teachingModes: [TeachingMode.ONLINE],
      };
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        serviceAreas: [],
        location: null,
      };
      expect(service.matchesLocation(request, candidate)).toBe(true);
    });

    it('accepts in-person requests without a stated location constraint', () => {
      const request: EligibilityRequest = {
        ...baseRequest,
        serviceArea: null,
        location: null,
      };
      expect(service.matchesLocation(request, matchingCandidate)).toBe(true);
    });
  });

  describe('availability matching', () => {
    it('accepts a tutor whose window covers the requested slot', () => {
      expect(service.matchesAvailability(baseRequest, matchingCandidate)).toBe(true);
    });

    it('rejects a tutor with a conflicting slot on the same day', () => {
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        availability: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '12:00' }],
      };
      expect(service.matchesAvailability(baseRequest, candidate)).toBe(false);
    });

    it('rejects a tutor available on a different day', () => {
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        availability: [{ dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '09:00', endTime: '18:00' }],
      };
      expect(service.matchesAvailability(baseRequest, candidate)).toBe(false);
    });

    it('accepts when a tutor has no overlapping availability at all', () => {
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        availability: [
          { dayOfWeek: DayOfWeek.TUESDAY, startTime: '09:00', endTime: '10:00' },
        ],
      };
      expect(service.matchesAvailability(baseRequest, candidate)).toBe(false);
    });

    it('accepts a request with no schedule constraint', () => {
      const request: EligibilityRequest = { ...baseRequest, schedule: [] };
      const candidate: TutorCandidate = { ...matchingCandidate, availability: [] };
      expect(service.matchesAvailability(request, candidate)).toBe(true);
    });

    it('requires every requested slot to be covered', () => {
      const request: EligibilityRequest = {
        ...baseRequest,
        schedule: [
          { dayOfWeek: DayOfWeek.MONDAY, startTime: '15:00', endTime: '17:00' },
          { dayOfWeek: DayOfWeek.TUESDAY, startTime: '10:00', endTime: '11:00' },
        ],
      };
      const candidate: TutorCandidate = {
        ...matchingCandidate,
        availability: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '18:00' }],
      };
      expect(service.matchesAvailability(request, candidate)).toBe(false);
    });
  });

  describe('account and profile status', () => {
    it('accepts an active account with an active profile', () => {
      expect(service.isEligible(baseRequest, matchingCandidate)).toBe(true);
    });

    it('rejects an inactive tutor account', () => {
      const candidate: TutorCandidate = { ...matchingCandidate, accountStatus: 'DISABLED' };
      expect(service.accountIsActive(candidate)).toBe(false);
      expect(service.isEligible(baseRequest, candidate)).toBe(false);
    });

    it('rejects a pending-verification tutor account', () => {
      const candidate: TutorCandidate = { ...matchingCandidate, accountStatus: 'PENDING_VERIFICATION' };
      expect(service.isEligible(baseRequest, candidate)).toBe(false);
    });

    it('rejects an inactive tutor profile', () => {
      const candidate: TutorCandidate = { ...matchingCandidate, profileStatus: 'INACTIVE' };
      expect(service.profileIsActive(candidate)).toBe(false);
      expect(service.isEligible(baseRequest, candidate)).toBe(false);
    });

    it('rejects a suspended tutor profile', () => {
      const candidate: TutorCandidate = { ...matchingCandidate, profileStatus: 'SUSPENDED' };
      expect(service.isEligible(baseRequest, candidate)).toBe(false);
    });
  });
});