import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger('EmailService');
  private readonly provider: string;
  private readonly webOrigin: string;
  private readonly inbox = new Map<string, EmailMessage>();
  private transporter: Transporter | null = null;
  private readonly smtpFrom: string;
  private readonly smtpUser: string;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>('app.emailProvider') ?? 'mock';
    this.webOrigin = this.config.get<string>('app.webOrigin') ?? 'http://localhost:3000';
    this.smtpUser = this.config.get<string>('app.smtpUser') ?? '';
    // Gmail and most providers reject a From address that isn't the
    // authenticated account (or an approved alias), so fall back to the
    // SMTP username when no explicit SMTP_FROM is configured.
    const configuredFrom = this.config.get<string>('app.smtpFrom') ?? '';
    this.smtpFrom = configuredFrom || this.smtpUser || 'noreply@tedor.local';
  }

  async onModuleInit(): Promise<void> {
    if (this.provider === 'smtp') {
      const host = this.config.get<string>('app.smtpHost');
      const secure = this.config.get<boolean>('app.smtpSecure') ?? false;
      const port = this.config.get<number>('app.smtpPort') ?? (secure ? 465 : 587);
      const user = this.smtpUser;
      const pass = this.config.get<string>('app.smtpPassword');

      if (!host) {
        this.logger.warn(
          'SMTP provider selected but SMTP_HOST is not configured; falling back to mock delivery.',
        );
        return;
      }

      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: user && pass ? { user, pass } : undefined,
        });
        await this.transporter.verify();
        this.logger.log(`SMTP transport ready (host=${host}, port=${port}, secure=${secure})`);
      } catch (error) {
        this.logger.warn(
          `Failed to initialize SMTP transport: ${error instanceof Error ? error.message : String(error)}. Falling back to mock delivery.`,
        );
        this.transporter = null;
      }
    }
  }

  lastMessageFor(to: string): EmailMessage | undefined {
    return this.inbox.get(to);
  }

  async send(message: EmailMessage): Promise<void> {
    if (this.provider === 'mock' || !this.transporter) {
      this.inbox.set(message.to, message);
      this.logger.warn(`[mock-email] to=${message.to} | ${message.subject}\n${message.body}`);
      return;
    }
    await this.sendViaProvider(message);
  }

  buildVerifyEmailLink(token: string): string {
    return `${this.baseUrl()}/verify-email?token=${token}`;
  }

  buildResetPasswordLink(token: string): string {
    return `${this.baseUrl()}/reset-password?token=${token}`;
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<void> {
    await this.send({
      to,
      subject: 'Welcome to Tedor Tutors!',
      body: `Hi ${userName},\n\nWelcome to Tedor Tutors! We're excited to have you on board.\n\nYour account has been created successfully. Please verify your email address to get started.\n\nIf you have any questions, feel free to reach out to our support team.\n\nBest regards,\nThe Tedor Tutors Team`,
    });
  }

  async sendLoginNotification(
    to: string,
    userName: string,
    details: { ip?: string; userAgent?: string; time: Date },
  ): Promise<void> {
    const ipText = details.ip ? details.ip : 'unknown';
    const uaText = details.userAgent ? details.userAgent : 'unknown device';
    const timeText = details.time.toLocaleString();
    await this.send({
      to,
      subject: 'New login to your Tedor account',
      body: `Hi ${userName},\n\nA new login was detected on your Tedor account.\n\nDetails:\n- Time: ${timeText}\n- IP: ${ipText}\n- Device: ${uaText}\n\nIf this was you, you can safely ignore this email.\n\nIf you did not perform this login, please change your password immediately and review your account security settings.\n\nBest regards,\nThe Tedor Tutors Team`,
    });
  }

  private baseUrl(): string {
    return this.webOrigin;
  }

  private async sendViaProvider(message: EmailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Email provider "${this.provider}" is not configured yet; falling back to mock delivery.`,
      );
      this.inbox.set(message.to, message);
      this.logger.warn(`[mock-email] to=${message.to} | ${message.subject}\n${message.body}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.smtpFrom,
        to: message.to,
        subject: message.subject,
        text: message.body,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${message.to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
