import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../common/api.exception';
import { generateOpaqueToken, sha256 } from '../common/crypto.utils';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './jwt-payload.interface';

export interface SessionResult {
  sessionToken: string;
  sessionId: string;
  userId: string;
}

@Injectable()
export class TokenService {
  private readonly accessTtl: string;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessTtl = config.get<string>('app.jwtAccessTtl') ?? '15m';
    this.refreshTtlMs = (config.get<number>('app.jwtRefreshTtlDays') ?? 30) * 24 * 60 * 60 * 1000;
  }

  issueAccessToken(user: { id: string; email: string; roleName: string }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.roleName,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.secondsFor(this.accessTtl),
    };
    return this.jwt.sign(payload);
  }

  async createSession(userId: string, ctx: { userAgent?: string; ip?: string }): Promise<SessionResult> {
    const sessionToken = generateOpaqueToken(48);
    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: sha256(sessionToken),
        userAgent: ctx.userAgent ?? null,
        ip: ctx.ip ?? null,
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
    });
    return { sessionToken, sessionId: session.id, userId: session.userId };
  }

  async rotateSession(
    currentToken: string,
    ctx: { userAgent?: string; ip?: string },
  ): Promise<SessionResult> {
    const current = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(currentToken) },
    });
    if (!current) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, {
        code: 'TOKEN_INVALID',
        message: 'Invalid refresh token',
      });
    }
    if (current.revokedAt) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, {
        code: 'TOKEN_REVOKED',
        message: 'Refresh token has been revoked',
      });
    }
    if (current.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.update({
        where: { id: current.id },
        data: { revokedAt: new Date() },
      });
      throw new ApiException(HttpStatus.UNAUTHORIZED, {
        code: 'TOKEN_EXPIRED',
        message: 'Refresh token has expired',
      });
    }

    const next = await this.createSession(current.userId, ctx);
    await this.prisma.session.update({
      where: { id: current.id },
      data: {
        revokedAt: new Date(),
        replacedBy: next.sessionId,
      },
    });
    return next;
  }

  async revokeSession(token: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: sha256(token) } });
    if (session && !session.revokedAt) {
      await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createEmailVerificationCode(userId: string): Promise<string> {
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: sha256(code),
        expiresAt,
      },
    });
    return code;
  }

  async consumeEmailVerificationCode(code: string): Promise<string> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: sha256(code) },
    });
    if (!record || record.consumedAt) {
      throw new ApiException(HttpStatus.BAD_REQUEST, { code: 'CODE_INVALID', message: 'Invalid verification code' });
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, { code: 'CODE_EXPIRED', message: 'Verification code has expired' });
    }
    await this.prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: record.userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return record.userId;
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    const raw = generateOpaqueToken(32);
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return raw;
  }

  async consumePasswordResetToken(token: string): Promise<string> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!record || record.consumedAt) {
      throw new ApiException(HttpStatus.BAD_REQUEST, { code: 'TOKEN_INVALID', message: 'Invalid reset token' });
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, { code: 'TOKEN_EXPIRED', message: 'Reset token has expired' });
    }
    await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return record.userId;
  }

  private generateVerificationCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private secondsFor(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 15 * 60;
    const value = Number(match[1]);
    switch (match[2]) {
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }
}