import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private readonly provider: string;
  private readonly inbox = new Map<string, EmailMessage>();

  constructor(config: ConfigService) {
    this.provider = config.get<string>('app.emailProvider') ?? 'mock';
  }

  // In-memory delivery used by the mail mock so tests and local tooling can
  // read verification/reset links without a real SMTP provider.
  lastMessageFor(to: string): EmailMessage | undefined {
    return this.inbox.get(to);
  }

  async send(message: EmailMessage): Promise<void> {
    if (this.provider === 'mock') {
      this.inbox.set(message.to, message);
      // Development-only: prints the link containing the token/code so flows can
      // be exercised locally. In production providers (e.g. SMTP) the token is
      // never logged.
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

  private baseUrl(): string {
    return process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  }

  private async sendViaProvider(_message: EmailMessage): Promise<void> {
    // Foundation hook for a transactional email provider (e.g. nodemailer/SES).
    // Implemented in the email-infrastructure branch; until then, EmailService
    // always uses the mock provider, so no secrets are ever written to logs.
    this.logger.warn(
      `Email provider "${this.provider}" is not configured yet; falling back to mock delivery.`,
    );
  }
}