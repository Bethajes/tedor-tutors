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

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  private splitName(name: string): { firstName: string; lastName: string } {
    const parts = name.trim().split(/\s+/);
    return {
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' ') ?? '',
    };
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
    await this.getOrCreateProfile(userId);

    const data: Prisma.ClientProfileUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl ?? null;
    if (dto.phone !== undefined) data.phone = dto.phone ?? null;
    if (dto.preferredLanguage !== undefined) data.preferredLanguage = dto.preferredLanguage ?? null;
    if (dto.location !== undefined) data.location = dto.location ?? null;
    if (dto.address !== undefined) data.address = dto.address ?? null;
    if (dto.bio !== undefined) data.bio = dto.bio ?? null;

    if (Object.keys(data).length > 0) {
      await this.prisma.clientProfile.update({ where: { userId }, data });
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

  private toDateOfBirth(dto: { dateOfBirth?: string }): Date | undefined {
    if (dto.dateOfBirth === undefined || dto.dateOfBirth === null) return undefined;
    const date = new Date(dto.dateOfBirth);
    if (Number.isNaN(date.getTime())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: 'dateOfBirth must be a valid date',
      });
    }
    if (date.getTime() > Date.now()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'VALIDATION_FAILED',
        message: FUTURE_DOB_MESSAGE,
      });
    }
    return date;
  }

  async listLearners(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const learners = await this.prisma.learner.findMany({
      where: { clientProfileId: profile.id, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return { items: learners.map((learner) => this.serializeLearner(learner)) };
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
    const dateOfBirth = this.toDateOfBirth(dto);
    const learner = await this.prisma.learner.create({
      data: {
        clientProfileId: profile.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dateOfBirth ?? null,
        gender: dto.gender ?? null,
        grade: dto.grade ?? null,
        school: dto.school ?? null,
        curriculum: dto.curriculum ?? null,
        subjects: dto.subjects ?? [],
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
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.dateOfBirth !== undefined) {
      const date = this.toDateOfBirth(dto);
      data.dateOfBirth = date ?? null;
    }
    if (dto.gender !== undefined) data.gender = dto.gender ?? null;
    if (dto.grade !== undefined) data.grade = dto.grade ?? null;
    if (dto.school !== undefined) data.school = dto.school ?? null;
    if (dto.curriculum !== undefined) data.curriculum = dto.curriculum ?? null;
    if (dto.subjects !== undefined) data.subjects = dto.subjects;
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
}