import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UserRoleName } from '@prisma/client';
import type { PublicUser } from '@tedor/types';
import { hashPassword, verifyPassword } from '../common/password.utils';
import { sha256 } from '../common/crypto.utils';
import { ApiException } from '../common/api.exception';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { TelegramService } from './telegram.service';
import { TokenService } from './token.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  TelegramLinkDto,
  VerifyEmailDto,
} from './dto/auth.dto';

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
    private readonly telegram: TelegramService,
  ) {}

  async register(dto: RegisterDto, ctx: RequestContext) {
    const normalizedPhone = dto.phone ? dto.phone.trim() : null;
    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: dto.role } });

    await this.ensureIdentityAvailable(dto.email, normalizedPhone);

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user
      .create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: normalizedPhone,
          passwordHash,
          roleId: role.id,
        },
      })
      .catch((error: Prisma.PrismaClientKnownRequestError) => {
        if (error.code === 'P2002') {
          const target = String((error.meta?.target as string[] | undefined)?.join(',') ?? 'field');
          if (target.includes('phone')) {
            throw new ApiException(HttpStatus.CONFLICT, { code: 'PHONE_IN_USE', message: 'An account with this phone number already exists' });
          }
          throw new ApiException(HttpStatus.CONFLICT, { code: 'EMAIL_IN_USE', message: 'An account with this email already exists' });
        }
        throw error;
      });

    await this.sendVerificationEmail(user.email);
    this.email.sendWelcomeEmail(user.email, user.name).catch((error) => {
      this.logger?.error?.(`Failed to send welcome email to ${user.email}: ${error instanceof Error ? error.message : String(error)}`);
    });

    const session = await this.tokens.createSession(user.id, ctx);
    const accessToken = this.tokens.issueAccessToken({
      id: user.id,
      email: user.email,
      roleName: role.name,
    });

    return {
      user: this.toPublicUser(user, role.name),
      tokens: { accessToken, refreshToken: session.sessionToken },
    };
  }

  async login(dto: LoginDto, ctx: RequestContext) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, name: true, phone: true, passwordHash: true, status: true, emailVerifiedAt: true, telegramId: true, telegramUsername: true, roleId: true, createdAt: true, updatedAt: true, role: { select: { name: true } } },
    });

    if (!user) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
    const passwordOk = await verifyPassword(user.passwordHash, dto.password);
    if (!passwordOk) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
    if (user.status === 'DISABLED') {
      throw new ApiException(HttpStatus.FORBIDDEN, { code: 'ACCOUNT_DISABLED', message: 'This account has been disabled' });
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    this.email.sendLoginNotification(user.email, user.name, {
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      time: new Date(),
    }).catch((error) => {
      this.logger.error(`Failed to send login notification to ${user.email}: ${error instanceof Error ? error.message : String(error)}`);
    });

    const session = await this.tokens.createSession(user.id, ctx);
    const accessToken = this.tokens.issueAccessToken({ id: user.id, email: user.email, roleName: user.role.name });

    return {
      user: this.toPublicUser(user, user.role.name),
      tokens: { accessToken, refreshToken: session.sessionToken },
    };
  }

  async refresh(dto: RefreshDto, ctx: RequestContext) {
    // Surface a disabled account before touching the session so the client gets
    // a clear ACCOUNT_DISABLED instead of a generic token error.
    const existing = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(dto.refreshToken) },
      select: { userId: true },
    });
    if (existing) {
      const owner = await this.prisma.user.findUnique({
        where: { id: existing.userId },
        select: { status: true },
      });
      if (owner?.status === 'DISABLED') {
        throw new ApiException(HttpStatus.FORBIDDEN, {
          code: 'ACCOUNT_DISABLED',
          message: 'This account has been disabled',
        });
      }
    }

    const rotated = await this.tokens.rotateSession(dto.refreshToken, ctx);
    const user = await this.prisma.user.findUnique({
      where: { id: rotated.userId },
      select: { id: true, email: true, name: true, phone: true, status: true, emailVerifiedAt: true, telegramId: true, telegramUsername: true, roleId: true, createdAt: true, updatedAt: true, role: { select: { name: true } } },
    });
    if (!user) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, { code: 'UNAUTHORIZED', message: 'Session is no longer valid' });
    }
    if (user.status === 'DISABLED') {
      throw new ApiException(HttpStatus.FORBIDDEN, { code: 'ACCOUNT_DISABLED', message: 'This account has been disabled' });
    }

    this.prisma.session
      .update({ where: { id: rotated.sessionId }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return {
      accessToken: this.tokens.issueAccessToken({ id: user.id, email: user.email, roleName: user.role.name }),
      refreshToken: rotated.sessionToken,
    };
  }

  async logout(dto: LogoutDto): Promise<void> {
    await this.tokens.revokeSession(dto.refreshToken);
  }

  async listSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true, lastUsedAt: true, revokedAt: true },
    });
    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ip: null as string | null, // not exposed to clients; reserved for admin tooling
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      revoked: session.revokedAt !== null,
    }));
  }

  async revokeSessionById(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!session) {
      throw new ApiException(HttpStatus.NOT_FOUND, { code: 'NOT_FOUND', message: 'Session not found' });
    }
    await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, status: true, emailVerifiedAt: true, telegramId: true, telegramUsername: true, roleId: true, createdAt: true, updatedAt: true, role: { select: { name: true } } },
    });
    if (!user) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, { code: 'UNAUTHORIZED', message: 'Account not found' });
    }
    return this.toPublicUser(user, user.role.name);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
    const currentOk = await verifyPassword(user.passwordHash, dto.currentPassword);
    if (!currentOk) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, { code: 'PASSWORD_INCORRECT', message: 'Current password is incorrect' });
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    // Password changed: revoke every issued refresh token so all devices must
    // re-authenticate (except the caller, who holds the fresh access token only).
    await this.tokens.revokeAllUserSessions(userId);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true, email: true } });
    if (user) {
      const token = await this.tokens.createPasswordResetToken(user.id);
      await this.email.send({
        to: user.email,
        subject: 'Reset your Tedor password',
        body: `Use this link to reset your password: ${this.email.buildResetPasswordLink(token)}`,
      });
    }
    // Deliberately identical response for existing and unknown emails.
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = await this.tokens.consumePasswordResetToken(dto.token);
    const passwordHash = await hashPassword(dto.password);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.tokens.revokeAllUserSessions(userId);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const userId = await this.tokens.consumeEmailVerificationToken(dto.token);
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
    });
  }

  async resendVerification(dto: ResendVerificationDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (user && !user.emailVerifiedAt) {
      await this.sendVerificationEmail(user.email);
    }
  }

  async linkTelegram(userId: string, dto: TelegramLinkDto): Promise<void> {
    const telegramUser = this.telegram.verify(dto.initData);
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, telegramUsername: true },
    });
    if (!currentUser) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, { code: 'UNAUTHORIZED', message: 'Account not found' });
    }
    if (currentUser.telegramId === telegramUser.id) {
      return; // Already linked to this Telegram account.
    }

    const owner = await this.prisma.user.findUnique({ where: { telegramId: telegramUser.id }, select: { id: true } });
    if (owner && owner.id !== userId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: 'TELEGRAM_ALREADY_LINKED',
        message: 'This Telegram account is already linked to another Tedor account',
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramId: telegramUser.id, telegramUsername: telegramUser.username },
    });
  }

  private async ensureIdentityAvailable(email: string, phone: string | null): Promise<void> {
    const [emailUser, phoneUser] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      phone ? this.prisma.user.findUnique({ where: { phone }, select: { id: true } }) : Promise.resolve(null),
    ]);
    if (emailUser) {
      throw new ApiException(HttpStatus.CONFLICT, { code: 'EMAIL_IN_USE', message: 'An account with this email already exists' });
    }
    if (phoneUser) {
      throw new ApiException(HttpStatus.CONFLICT, { code: 'PHONE_IN_USE', message: 'An account with this phone number already exists' });
    }
  }

  private async sendVerificationEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
    const token = await this.tokens.createEmailVerificationToken(user.id);
    await this.email.send({
      to: email,
      subject: 'Verify your Tedor email',
      body: `Verify your email address: ${this.email.buildVerifyEmailLink(token)}`,
    });
  }

  private toPublicUser(
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      status: string;
      emailVerifiedAt: Date | null;
      telegramId: string | null;
      telegramUsername?: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    roleName: UserRoleName | string,
  ): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: roleName as PublicUser['role'],
      status: user.status as PublicUser['status'],
      emailVerified: user.emailVerifiedAt !== null,
      telegramLinked: user.telegramId !== null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}