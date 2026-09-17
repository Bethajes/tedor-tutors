import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { UserRoleName } from '@prisma/client';
import { ApiException } from '../common/api.exception';
import { CurrentUser, Roles, type AuthenticatedUser } from '../common/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';

@Controller('tutors')
@Roles(UserRoleName.CLIENT, UserRoleName.COORDINATOR, UserRoleName.ADMIN, UserRoleName.SUPER_ADMIN)
export class TutorsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async getTutorProfile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    void user;
    const profile = await this.prisma.tutorProfile.findUnique({
      where: { userId: id, status: 'ACTIVE', user: { status: 'ACTIVE' } },
      include: { subjects: true, availability: true, user: { select: { name: true, status: true } } },
    });

    if (!profile) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: 'NOT_FOUND',
        message: 'Tutor profile not found',
      });
    }

    const experienceYears = (() => {
      const months = (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      return Math.max(0, Math.floor(months / 12));
    })();

    return {
      id: profile.userId,
      name: profile.user.name,
      photo: profile.photoUrl,
      bio: profile.bio,
      subjects: Array.from(
        new Set(profile.subjects.map((subject) => subject.subject)),
      ),
      levels: Array.from(
        new Set(profile.subjects.flatMap((subject) => subject.academicLevels)),
      ),
      experience: experienceYears,
      languages: [],
      teachingModes: profile.teachingModes,
      serviceAreas: profile.serviceAreas,
      location: profile.location,
      hourlyRate: profile.hourlyRate,
      availability: profile.availability.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
      rating: null,
    };
  }
}