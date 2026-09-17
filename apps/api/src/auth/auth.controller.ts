import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser, Public, type AuthenticatedUser } from '../common/auth.decorators';
import { AuthService } from './auth.service';
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

function contextFrom(request: Request): { ip?: string; userAgent?: string } {
  return {
    ip: request.ip ?? request.socket.remoteAddress,
    userAgent: request.headers['user-agent'],
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ short: { limit: 30, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.auth.register(dto, contextFrom(request));
  }

  @Public()
  @Throttle({ short: { limit: 30, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.auth.login(dto, contextFrom(request));
  }

  @Public()
  @Throttle({ short: { limit: 60, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto, @Req() request: Request) {
    return this.auth.refresh(dto, contextFrom(request));
  }

  @Public()
  @Throttle({ short: { limit: 60, ttl: 60_000 } })
  @Post('logout')
  @HttpCode(200)
  async logout(@Body() dto: LogoutDto) {
    await this.auth.logout(dto);
    return { success: true as const };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getMe(user.userId);
  }

  @Get('sessions')
  sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.listSessions(user.userId);
  }

  @Delete('sessions/:sessionId')
  async revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('sessionId') sessionId: string) {
    await this.auth.revokeSessionById(user.userId, sessionId);
    return { success: true as const };
  }

  @Post('change-password')
  @HttpCode(200)
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.userId, dto);
    return { success: true as const };
  }

  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto);
    return { success: true as const };
  }

  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
    return { success: true as const };
  }

  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto);
    return { success: true as const };
  }

  @Public()
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.auth.resendVerification(dto);
    return { success: true as const };
  }

  @Post('telegram/link')
  @HttpCode(200)
  async linkTelegram(@CurrentUser() user: AuthenticatedUser, @Body() dto: TelegramLinkDto) {
    await this.auth.linkTelegram(user.userId, dto);
    return { success: true as const };
  }
}