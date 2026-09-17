export const SCORING_WEIGHTS = {
  subject: 0.25,
  availability: 0.2,
  academicLevel: 0.15,
  locationMode: 0.1,
  experience: 0.1,
  budget: 0.1,
  reliability: 0.05,
  preferences: 0.05,
} as const;

export type ScoringFactorName = keyof typeof SCORING_WEIGHTS;

export const SCORING_WEIGHT_SUM: number = Object.values(SCORING_WEIGHTS).reduce(
  (sum, weight) => sum + weight,
  0,
);

export const EXPERIENCE_CONFIG = {
  maxExperienceMonths: 36,
  maxMonthsForFullScore: 36,
  fallbackScore: 50,
} as const;

export const RELIABILITY_CONFIG = {
  fallbackScore: 50,
} as const;

export const PREFERENCE_CONFIG = {
  fallbackScore: 50,
} as const;

export const BUDGET_CONFIG = {
  overBudgetPenaltyPerPercent: 0.5,
  maxPenalty: 50,
  noBudgetScore: 100,
} as const;