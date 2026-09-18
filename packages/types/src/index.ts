export const USER_ROLES = ['CLIENT', 'TUTOR', 'COORDINATOR', 'ADMIN', 'SUPER_ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SELF_REGISTRABLE_ROLES = ['CLIENT', 'TUTOR'] as const;
export type SelfRegistrableRole = (typeof SELF_REGISTRABLE_ROLES)[number];

export const ACCOUNT_STATUSES = ['PENDING_VERIFICATION', 'ACTIVE', 'DISABLED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  telegramLinked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionInfo {
  id: string;
  tokenId: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
  current: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: SelfRegistrableRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  PHONE_IN_USE: 'PHONE_IN_USE',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_PENDING: 'ACCOUNT_PENDING',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  PASSWORD_INCORRECT: 'PASSWORD_INCORRECT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  TELEGRAM_BAD_INIT: 'TELEGRAM_BAD_INIT',
  TELEGRAM_ALREADY_LINKED: 'TELEGRAM_ALREADY_LINKED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
export type Gender = (typeof GENDERS)[number];

export interface ClientProfileAccountInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  status: AccountStatus;
  createdAt: string;
}

export interface ClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  phone: string | null;
  preferredLanguage: string | null;
  location: string | null;
  address: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
  user: ClientProfileAccountInfo;
}

export interface Learner {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: Gender | null;
  grade: string | null;
  school: string | null;
  curriculum: string | null;
  subjects: string[];
  goals: string | null;
  preferredLanguage: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateClientProfileRequest {
  firstName?: string;
  lastName?: string;
  photoUrl?: string | null;
  phone?: string | null;
  preferredLanguage?: string | null;
  location?: string | null;
  address?: string | null;
  bio?: string | null;
}

export interface CreateLearnerRequest {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: Gender;
  grade?: string | null;
  school?: string | null;
  curriculum?: string | null;
  subjects?: string[];
  goals?: string | null;
  preferredLanguage?: string | null;
  notes?: string | null;
}

export type UpdateLearnerRequest = Partial<CreateLearnerRequest>;

export interface LearnerList {
  items: Learner[];
}

export const OPPORTUNITY_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export interface OpportunityScheduleSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface TutorOpportunity {
  id: string;
  status: OpportunityStatus;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  match: {
    id: string;
    score: number;
    matchReasons: string[];
  };
  request: {
    id: string;
    subjects: string[];
    academicLevels: string[];
    teachingModes: string[];
    location: string | null;
    serviceArea: string | null;
    notes: string | null;
    schedule: OpportunityScheduleSlot[];
  };
}

export interface TutorOpportunityList {
  opportunities: TutorOpportunity[];
  count: number;
}

export interface OpportunityResponse {
  opportunityId: string;
  status: OpportunityStatus;
  respondedAt: string | null;
}