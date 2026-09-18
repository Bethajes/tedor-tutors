import { z } from 'zod';

const NAME = z.string().trim().min(1, 'Name is required').max(120);
const OPTIONAL_TEXT = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value && value.trim() ? value.trim() : null));
const PHONE = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid phone in E.164 format (e.g. +380501234567)')
  .max(20)
  .optional()
  .or(z.literal(''))
  .nullable()
  .transform((value) => (value ? value : null));

const PHOTO_URL = z
  .string()
  .max(5_400_000)
  .refine(
    (value) => {
      if (value.startsWith('data:image/')) {
        const comma = value.indexOf(',');
        if (comma === -1) return false;
        const header = value.slice(0, comma);
        const mime = header.slice(5, header.indexOf(';') === -1 ? header.length : header.indexOf(';'));
        return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(mime);
      }
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    'photoUrl must be an image data URI or an http(s) URL',
  )
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const updateClientProfileSchema = z.object({
  firstName: NAME.optional(),
  lastName: NAME.optional(),
  photoUrl: PHOTO_URL,
  phone: PHONE,
  preferredLanguage: OPTIONAL_TEXT(100),
  location: OPTIONAL_TEXT(255),
  address: OPTIONAL_TEXT(255),
  bio: OPTIONAL_TEXT(2000),
});

const GENDER = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().nullable();

const DATE_OF_BIRTH = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be a valid ISO-8601 date (YYYY-MM-DD)')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    );
  }, 'dateOfBirth must be a real calendar date')
  .refine((value) => new Date(`${value}T00:00:00Z`).getTime() <= Date.now(), 'dateOfBirth cannot be in the future')
  .refine((value) => {
    const oldest = new Date();
    oldest.setFullYear(oldest.getFullYear() - 120);
    return new Date(`${value}T00:00:00Z`).getTime() >= oldest.getTime();
  }, 'dateOfBirth must be within the last 120 years')
  .optional();

const SUBJECTS = z
  .array(z.string().trim().min(1, 'Subject cannot be empty').max(120))
  .max(20, 'You can add at most 20 subjects')
  .transform((items) => {
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const item of items) {
      const value = item.trim().replace(/\s+/g, ' ');
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push(value);
    }
    return cleaned;
  })
  .optional();

export const createLearnerSchema = z.object({
  firstName: NAME,
  lastName: NAME,
  dateOfBirth: DATE_OF_BIRTH,
  gender: GENDER,
  grade: OPTIONAL_TEXT(120),
  school: OPTIONAL_TEXT(255),
  curriculum: OPTIONAL_TEXT(255),
  subjects: SUBJECTS,
  goals: OPTIONAL_TEXT(2000),
  preferredLanguage: OPTIONAL_TEXT(100),
  notes: OPTIONAL_TEXT(2000),
});

export const updateLearnerSchema = createLearnerSchema.partial();

export type UpdateClientProfileInput = z.input<typeof updateClientProfileSchema>;
export type CreateLearnerInput = z.input<typeof createLearnerSchema>;
export type UpdateLearnerInput = z.input<typeof updateLearnerSchema>;