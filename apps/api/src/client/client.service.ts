import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiException } from '../common/api.exception';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  UpdateClientProfileDto,
} from './dto/client-profile.dto';
import { CreateLearnerDto, UpdateLearnerDto } from './dto/learner.dto';

export interface UploadedPhotoFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const MAX_PHOTO_BYTES = 5_000_000;
const FUTURE_DOB_MESSAGE = 'dateOfBirth cannot be in the future';
const MAX_SUBJECTS = 20;
const MAX_SUBJECT_LENGTH = 120;
const MAX_LEARNERS_PER_CLIENT = 25;
const MAX_AGE_YEARS = 120;
const DEFAULT_LEARNERS_LIMIT = 50;
const MAX_LEARNERS_LIMIT = 100;

export { MAX_LEARNERS_PER_CLIENT, MAX_SUBJECTS };

export interface ListLearnersOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  private splitName(name: string): { firstName: string; lastName: string } {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' ') ?? '',
    };
  }

  private cleanNamePart(value: string | undefined, field: 'firstName' | 'lastName'): string | undefined {
    if (value === undefined) return undefined;
    const cleaned = value.trim().replace(/\s+/g, ' ');
    if (!cleaned) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: `${field} cannot be blank`,
      });
    }
    return cleaned;
  }

  /**
   * Normalize a subjects list: trim entries, drop empties and overlong
   * values, de-duplicate case-insensitively (keeping the first casing),
   * and cap the list length. Never throws — DTO validation already
   * rejects malformed payloads; this is defense-in-depth so stored data
   * stays clean no matter the caller.
   */
  private normalizeSubjects(subjects: string[] | undefined | null): string[] | undefined {
    if (subjects === undefined || subjects === null) return subjects ?? undefined;
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const raw of subjects) {
      if (typeof raw !== 'string') continue;
      const cleaned = raw.trim().replace(/\s+/g, ' ');
      if (!cleaned || cleaned.length > MAX_SUBJECT_LENGTH) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(cleaned);
      if (normalized.length >= MAX_SUBJECTS) break;
    }
    return normalized;
  }

  private async getOrCreateProfile(userId: string) {
    const existing = await this.prisma.clientProfile.findUnique({ where: { userId } });
    if (existing) return existing;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });
    if (!user) {
      throw new ApiException(HttpStatus.NOT_FOUND, { code: 'NOT_FOUND', message: 'User not found' });
    }

    const { firstName, lastName } = this.splitName(user.name);
    try {
      return await this.prisma.clientProfile.create({
        data: { userId, firstName, lastName },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.clientProfile.findUniqueOrThrow({ where: { userId } });
      }
      throw error;
    }
  }

  private serializeProfile(
    profile: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
      phone: string | null;
      preferredLanguage: string | null;
      location: string | null;
      address: string | null;
      bio: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      emailVerifiedAt: Date | null;
      status: string;
      createdAt: Date;
    },
  ) {
    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      photoUrl: profile.photoUrl,
      phone: profile.phone,
      preferredLanguage: profile.preferredLanguage,
      location: profile.location,
      address: profile.address,
      bio: profile.bio,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerifiedAt !== null,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async getProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        status: true,
        createdAt: true,
      },
    });
    return this.serializeProfile(profile, user);
  }

  async updateProfile(userId: string, dto: UpdateClientProfileDto) {
    const existing = await this.getOrCreateProfile(userId);

    const firstName = this.cleanNamePart(dto.firstName, 'firstName');
    const lastName = this.cleanNamePart(dto.lastName, 'lastName');

    const data: Prisma.ClientProfileUpdateInput = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl ?? null;
    if (dto.phone !== undefined) data.phone = dto.phone ?? null;
    if (dto.preferredLanguage !== undefined) data.preferredLanguage = dto.preferredLanguage ?? null;
    if (dto.location !== undefined) data.location = dto.location ?? null;
    if (dto.address !== undefined) data.address = dto.address ?? null;
    if (dto.bio !== undefined) data.bio = dto.bio ?? null;

    const nextFirst = firstName ?? existing.firstName;
    const nextLast = lastName ?? existing.lastName;
    const nextFullName = `${nextFirst} ${nextLast}`.trim().replace(/\s+/g, ' ');
    const namesChanged = firstName !== undefined || lastName !== undefined;

    if (Object.keys(data).length > 0 || namesChanged) {
      await this.prisma.$transaction(async (tx) => {
        if (Object.keys(data).length > 0) {
          await tx.clientProfile.update({ where: { userId }, data });
        }
        // Keep the account display name in sync with the profile name so
        // headers, emails, and admin views never show a stale name.
        if (namesChanged) {
          await tx.user.update({ where: { id: userId }, data: { name: nextFullName } });
        }
      });
    }
    return this.getProfile(userId);
  }

  async uploadPhoto(userId: string, file?: UploadedPhotoFile) {
    if (!file || !file.buffer) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: 'No image file provided',
      });
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: 'Unsupported image type. Use JPEG, PNG, WebP, GIF or AVIF.',
        details: { mimetype: file.mimetype },
      });
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: 'Photo must be 5MB or smaller',
        details: { size: file.size },
      });
    }

    await this.getOrCreateProfile(userId);
    const photoUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    await this.prisma.clientProfile.update({ where: { userId }, data: { photoUrl } });
    return { photoUrl };
  }

  private serializeLearner(learner: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    gender: string | null;
    grade: string | null;
    school: string | null;
    curriculum: string | null;
    subjects: string[];
    goals: string | null;
    preferredLanguage: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const age =
      learner.dateOfBirth === null
        ? null
        : this.ageFrom(learner.dateOfBirth);
    return {
      id: learner.id,
      firstName: learner.firstName,
      lastName: learner.lastName,
      dateOfBirth: learner.dateOfBirth === null ? null : learner.dateOfBirth.toISOString(),
      age,
      gender: learner.gender,
      grade: learner.grade,
      school: learner.school,
      curriculum: learner.curriculum,
      subjects: learner.subjects,
      goals: learner.goals,
      preferredLanguage: learner.preferredLanguage,
      notes: learner.notes,
      createdAt: learner.createdAt.toISOString(),
      updatedAt: learner.updatedAt.toISOString(),
    };
  }

  private ageFrom(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age -= 1;
    }
    return age;
  }

  private toDateOfBirth(dto: { dateOfBirth?: string | null }): Date | undefined {
    if (dto.dateOfBirth === undefined || dto.dateOfBirth === null) return undefined;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dto.dateOfBirth);
    if (!match) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: 'dateOfBirth must be a valid ISO-8601 date (YYYY-MM-DD)',
      });
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    // Reject impossible calendar dates ("2026-02-30" would otherwise roll
    // over into March when parsed with `new Date`).
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: 'dateOfBirth must be a real calendar date',
      });
    }
    if (date.getTime() > Date.now()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: FUTURE_DOB_MESSAGE,
      });
    }
    const oldestAllowed = new Date();
    oldestAllowed.setFullYear(oldestAllowed.getFullYear() - MAX_AGE_YEARS);
    if (date.getTime() < oldestAllowed.getTime()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: `dateOfBirth must be within the last ${MAX_AGE_YEARS} years`,
      });
    }
    return date;
  }

  async listLearners(userId: string, options: ListLearnersOptions = {}) {
    const profile = await this.getOrCreateProfile(userId);
    const learners = await this.prisma.learner.findMany({
      where: { clientProfileId: profile.id, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const needle = options.search?.trim().toLowerCase();
    const filtered = needle
      ? learners.filter((learner) =>
          [learner.firstName, learner.lastName, learner.school, learner.grade]
            .filter((field): field is string => typeof field === 'string' && field.length > 0)
            .some((field) => field.toLowerCase().includes(needle)) ||
          learner.subjects.some((subject) => subject.toLowerCase().includes(needle)),
        )
      : learners;

    const total = filtered.length;
    const limit = Math.min(
      Math.max(Math.floor(options.limit ?? DEFAULT_LEARNERS_LIMIT), 1),
      MAX_LEARNERS_LIMIT,
    );
    const offset = Math.max(Math.floor(options.offset ?? 0), 0);
    const page = filtered.slice(offset, offset + limit);

    return {
      items: page.map((learner) => this.serializeLearner(learner)),
      total,
    };
  }

  async getLearner(userId: string, learnerId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const learner = await this.prisma.learner.findFirst({
      where: { id: learnerId, clientProfileId: profile.id, deletedAt: null },
    });
    if (!learner) {
      throw new ApiException(HttpStatus.NOT_FOUND, { code: 'NOT_FOUND', message: 'Learner not found' });
    }
    return this.serializeLearner(learner);
  }

  async createLearner(userId: string, dto: CreateLearnerDto) {
    const profile = await this.getOrCreateProfile(userId);

    const activeCount = await this.prisma.learner.count({
      where: { clientProfileId: profile.id, deletedAt: null },
    });
    if (activeCount >= MAX_LEARNERS_PER_CLIENT) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: `You can manage at most ${MAX_LEARNERS_PER_CLIENT} learners per account`,
      });
    }

    const dateOfBirth = this.toDateOfBirth(dto);
    const learner = await this.prisma.learner.create({
      data: {
        clientProfileId: profile.id,
        firstName: dto.firstName.trim().replace(/\s+/g, ' '),
        lastName: dto.lastName.trim().replace(/\s+/g, ' '),
        dateOfBirth: dateOfBirth ?? null,
        gender: dto.gender ?? null,
        grade: dto.grade ?? null,
        school: dto.school ?? null,
        curriculum: dto.curriculum ?? null,
        subjects: this.normalizeSubjects(dto.subjects) ?? [],
        goals: dto.goals ?? null,
        preferredLanguage: dto.preferredLanguage ?? null,
        notes: dto.notes ?? null,
      },
    });
    return this.serializeLearner(learner);
  }

  async updateLearner(userId: string, learnerId: string, dto: UpdateLearnerDto) {
    const profile = await this.getOrCreateProfile(userId);
    const existing = await this.prisma.learner.findFirst({
      where: { id: learnerId, clientProfileId: profile.id, deletedAt: null },
    });
    if (!existing) {
      throw new ApiException(HttpStatus.NOT_FOUND, { code: 'NOT_FOUND', message: 'Learner not found' });
    }

    const data: Prisma.LearnerUpdateInput = {};
    if (dto.firstName !== undefined) {
      const cleaned = dto.firstName.trim().replace(/\s+/g, ' ');
      if (!cleaned) {
        throw new ApiException(HttpStatus.BAD_REQUEST, {
          code: 'VALIDATION_FAILED',
          message: 'firstName cannot be blank',
        });
      }
      data.firstName = cleaned;
    }
    if (dto.lastName !== undefined) {
      const cleaned = dto.lastName.trim().replace(/\s+/g, ' ');
      if (!cleaned) {
        throw new ApiException(HttpStatus.BAD_REQUEST, {
          code: 'VALIDATION_FAILED',
          message: 'lastName cannot be blank',
        });
      }
      data.lastName = cleaned;
    }
    if (dto.dateOfBirth !== undefined) {
      const date = this.toDateOfBirth(dto);
      data.dateOfBirth = date ?? null;
    }
    if (dto.gender !== undefined) data.gender = dto.gender ?? null;
    if (dto.grade !== undefined) data.grade = dto.grade ?? null;
    if (dto.school !== undefined) data.school = dto.school ?? null;
    if (dto.curriculum !== undefined) data.curriculum = dto.curriculum ?? null;
    if (dto.subjects !== undefined) data.subjects = this.normalizeSubjects(dto.subjects) ?? [];
    if (dto.goals !== undefined) data.goals = dto.goals ?? null;
    if (dto.preferredLanguage !== undefined) data.preferredLanguage = dto.preferredLanguage ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;

    const learner = await this.prisma.learner.update({
      where: { id: learnerId },
      data,
    });
    return this.serializeLearner(learner);
  }

  async deleteLearner(userId: string, learnerId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const existing = await this.prisma.learner.findFirst({
      where: { id: learnerId, clientProfileId: profile.id, deletedAt: null },
    });
    if (!existing) {
      throw new ApiException(HttpStatus.NOT_FOUND, { code: 'NOT_FOUND', message: 'Learner not found' });
    }
    await this.prisma.learner.update({
      where: { id: learnerId },
      data: { deletedAt: new Date() },
    });
    return { success: true as const };
  }

  /**
   * Single-call dashboard payload so the client home screen does not need
   * to waterfall profile + learners requests.
   */
  async getDashboard(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        status: true,
        createdAt: true,
      },
    });
    const learners = await this.prisma.learner.findMany({
      where: { clientProfileId: profile.id, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const subjectKeys = new Set<string>();
    for (const learner of learners) {
      for (const subject of learner.subjects) {
        subjectKeys.add(subject.trim().toLowerCase());
      }
    }

    const completenessChecks: Array<string | null | undefined> = [
      profile.photoUrl,
      profile.phone ?? user.phone,
      profile.preferredLanguage,
      profile.location,
      profile.bio,
    ];
    const filledFields = completenessChecks.filter(
      (field) => typeof field === 'string' && field.trim().length > 0,
    ).length;
    const learnerBonus = learners.length > 0 ? 1 : 0;
    const profileCompleteness = Math.round(
      ((filledFields + learnerBonus) / (completenessChecks.length + 1)) * 100,
    );

    const serialized = this.serializeProfile(profile, user);
    const recentLearners = learners
      .slice(0, 3)
      .map((learner) => this.serializeLearner(learner));

    return {
      profile: serialized,
      stats: {
        totalLearners: learners.length,
        subjectsCovered: subjectKeys.size,
        profileCompleteness,
        emailVerified: user.emailVerifiedAt !== null,
      },
      recentLearners,
    };
  }
}