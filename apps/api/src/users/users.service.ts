import { HttpStatus, Injectable } from '@nestjs/common';
import type { UserRoleName } from '@prisma/client';
import { ApiException } from '../common/api.exception';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, pageSize = 20) {
    const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, pageSize));
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(50, Math.max(1, pageSize)),
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          emailVerifiedAt: true,
          telegramId: true,
          createdAt: true,
          role: { select: { name: true } },
        },
      }),
    ]);
    return {
      items: rows.map(({ role, ...user }) => ({
        ...user,
        role: role.name,
        emailVerified: user.emailVerifiedAt !== null,
        telegramLinked: user.telegramId !== null,
        createdAt: user.createdAt.toISOString(),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / (Math.min(50, Math.max(1, pageSize)))) },
    };
  }

  async updateStatus(actor: { userId: string; roleName: UserRoleName }, targetUserId: string, status: UpdateUserStatusDto['status']) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: { select: { name: true } }, status: true },
    });
    if (!target) {
      throw new ApiException(HttpStatus.NOT_FOUND, { code: 'NOT_FOUND', message: 'User not found' });
    }
    if (target.role.name === 'SUPER_ADMIN' && actor.roleName !== 'SUPER_ADMIN') {
      throw new ApiException(HttpStatus.FORBIDDEN, { code: 'FORBIDDEN', message: 'Cannot change super admin accounts' });
    }
    if (target.id === actor.userId && status === 'DISABLED') {
      throw new ApiException(HttpStatus.BAD_REQUEST, { code: 'VALIDATION_FAILED', message: 'You cannot disable your own account' });
    }
    await this.prisma.user.update({ where: { id: targetUserId }, data: { status } });

    if (status === 'DISABLED') {
      await this.prisma.session.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true as const };
  }
}