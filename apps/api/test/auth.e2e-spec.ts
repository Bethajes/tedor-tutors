import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/auth/email.service';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://tedor:tedor_test_password@localhost:5433/tedor_test?schema=public';

const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let emailService: EmailService;

  const base = '/api/v1';

  const unique = (prefix: string): string =>
    `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
  const phone = (): string =>
    `+1202${Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join('')}`;
  const strongPassword = 'Test1234!';
  const seededAdmin = { email: 'admin@tedor.local', password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'AdminDev123!' };

  interface Tokens {
    accessToken: string;
    refreshToken: string;
  }

  const extract = (body: unknown): { user: unknown; tokens: Tokens } => {
    const data = (body as { success: boolean; data: unknown }).data as { user: unknown; tokens: Tokens };
    return data;
  };

  const register = async (overrides: Record<string, unknown> = {}) => {
    const email = unique('reg');
    const payload = {
      name: 'Test Client',
      email,
      password: strongPassword,
      role: 'CLIENT',
      ...overrides,
    };
    const response = await request(app.getHttpServer())
      .post(`${base}/auth/register`)
      .send(payload)
      .expect(201);
    return { ...extract(response.body), email, password: strongPassword, response };
  };

  const login = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password })
      .expect(200);
    return { ...extract(response.body), response };
  };

  const resetTokenFrom = (to: string, subjectPart: string): string => {
    const message = emailService.lastMessageFor(to);
    expect(message).toBeDefined();
    expect(message!.subject).toContain(subjectPart);
    const match = /token=([^&\s]+)/.exec(message!.body);
    if (!match) throw new Error('No token link found in mock email');
    return match[1];
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    emailService = app.get(EmailService);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('Register', () => {
    it('registers a CLIENT with verification pending', async () => {
      const account = await register();
      expect((account.user as { role: string }).role).toBe('CLIENT');
      expect((account.user as { emailVerified: boolean }).emailVerified).toBe(false);
      expect((account.user as { status: string }).status).toBe('PENDING_VERIFICATION');
      expect(account.tokens.accessToken).toBeDefined();
      expect(account.tokens.refreshToken).toBeDefined();
      expect(JSON.stringify(account.response.body)).not.toContain('passwordHash');
    });

    it('registers a TUTOR whose profile is created later', async () => {
      const account = await register({ name: 'Test Tutor', role: 'TUTOR' });
      expect((account.user as { role: string }).role).toBe('TUTOR');
    });

    it('never trusts a client-supplied admin role', async () => {
      const email = unique('root');
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/register`)
        .send({ name: 'Hacker', email, password: strongPassword, role: 'ADMIN' })
        .expect(400);
      expect((response.body as { error: { code: string } }).error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects invalid inputs', async () => {
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/register`)
        .send({ name: '', email: 'not-an-email', password: 'short', role: 'CLIENT' })
        .expect(400);
      expect((response.body as { error: { code: string } }).error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects duplicate email', async () => {
      const first = await register();
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/register`)
        .send({
          name: 'Duplicate',
          email: first.email,
          phone: phone(),
          password: strongPassword,
          role: 'CLIENT',
        })
        .expect(409);
      expect((response.body as { error: { code: string } }).error.code).toBe('EMAIL_IN_USE');
    });

    it('rejects duplicate phone', async () => {
      const shared = phone();
      await register({ phone: shared });
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/register`)
        .send({
          name: 'Duplicate Phone',
          email: unique('dup'),
          phone: shared,
          password: strongPassword,
          role: 'CLIENT',
        })
        .expect(409);
      expect((response.body as { error: { code: string } }).error.code).toBe('PHONE_IN_USE');
    });
  });

  describe('Login', () => {
    it('logs in with correct credentials', async () => {
      const account = await register();
      const session = await login(account.email, strongPassword);
      expect(session.tokens.accessToken).toBeDefined();
      expect(session.tokens.refreshToken).toBeDefined();
    });

    it('rejects a wrong password without leaking which field was wrong', async () => {
      const account = await register();
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/login`)
        .send({ email: account.email, password: 'WrongPass1!' })
        .expect(401);
      expect((response.body as { error: { code: string } }).error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects unknown emails with an identical error (enumeration protection)', async () => {
      const known = await register();
      const knownResult = await request(app.getHttpServer())
        .post(`${base}/auth/login`)
        .send({ email: known.email, password: 'AlsoWrong1!' })
        .expect(401);
      const unknownResult = await request(app.getHttpServer())
        .post(`${base}/auth/login`)
        .send({ email: unique('ghost'), password: 'AlsoWrong1!' })
        .expect(401);
      expect((knownResult.body as { error: unknown }).error).toEqual((unknownResult.body as { error: unknown }).error);
    });
  });

  describe('Me', () => {
    it('requires an access token', async () => {
      await request(app.getHttpServer()).get(`${base}/auth/me`).expect(401);
    });

    it('rejects an invalid or expired token', async () => {
      await request(app.getHttpServer())
        .get(`${base}/auth/me`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('returns the current user', async () => {
      const account = await register();
      const response = await request(app.getHttpServer())
        .get(`${base}/auth/me`)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .expect(200);
      const user = (response.body as { data: { email: string } }).data;
      expect(user.email).toBe(account.email);
    });
  });

  describe('Refresh & revocation', () => {
    it('rotates refresh tokens and rejects reuse of the old token', async () => {
      const account = await register();
      const first = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: account.tokens.refreshToken })
        .expect(200);
      const rotated = (first.body as { data: Tokens }).data;
      expect(rotated.accessToken).toBeDefined();
      expect(rotated.refreshToken).not.toBe(account.tokens.refreshToken);

      const reuse = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: account.tokens.refreshToken })
        .expect(401);
      expect((reuse.body as { error: { code: string } }).error.code).toBe('TOKEN_REVOKED');

      const second = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: rotated.refreshToken })
        .expect(200);
      const secondRotated = (second.body as { data: Tokens }).data;
      await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: rotated.refreshToken })
        .expect(401);
      expect((secondRotated as Tokens).refreshToken).toBeDefined();
    });

    it('rejects unknown refresh tokens', async () => {
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: 'never-issued-token' })
        .expect(401);
      expect((response.body as { error: { code: string } }).error.code).toBe('TOKEN_INVALID');
    });

    it('revokes the session on logout', async () => {
      const account = await register();
      await request(app.getHttpServer())
        .post(`${base}/auth/logout`)
        .send({ refreshToken: account.tokens.refreshToken })
        .expect(200);
      const refresh = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: account.tokens.refreshToken })
        .expect(401);
      expect((refresh.body as { error: { code: string } }).error.code).toBe('TOKEN_REVOKED');
    });

    it('stores only a hash of the refresh token', async () => {
      const account = await register();
      const session = await prisma.session.findFirst({
        where: { user: { email: account.email } },
        orderBy: { createdAt: 'desc' },
      });
      expect(session).toBeDefined();
      expect(session!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(session!.tokenHash).not.toBe(account.tokens.refreshToken);
    });
  });

  describe('Email verification', () => {
    it('verifies an account and marks it ACTIVE', async () => {
      const account = await register();
      const token = resetTokenFrom(account.email, 'Verify your Tedor email');
      await request(app.getHttpServer())
        .post(`${base}/auth/verify-email`)
        .send({ token })
        .expect(200);

      const me = await request(app.getHttpServer())
        .get(`${base}/auth/me`)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .expect(200);
      expect((me.body as { data: { emailVerified: boolean } }).data.emailVerified).toBe(true);

      const user = await prisma.user.findUnique({ where: { email: account.email } });
      expect(user!.status).toBe('ACTIVE');
    });

    it('rejects an unknown verification token', async () => {
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/verify-email`)
        .send({ token: 'not-a-real-token' })
        .expect(400);
      expect((response.body as { error: { code: string } }).error.code).toBe('TOKEN_INVALID');
    });

    it('resends and verifies with a fresh token while invalidating previous ones', async () => {
      const account = await register();
      const stale = resetTokenFrom(account.email, 'Verify your Tedor email');

      await request(app.getHttpServer())
        .post(`${base}/auth/resend-verification`)
        .send({ email: account.email })
        .expect(200);
      const fresh = resetTokenFrom(account.email, 'Verify your Tedor email');
      expect(fresh).not.toBe(stale);

      await request(app.getHttpServer()).post(`${base}/auth/verify-email`).send({ token: fresh }).expect(200);
      const staleUse = await request(app.getHttpServer())
        .post(`${base}/auth/verify-email`)
        .send({ token: stale })
        .expect(400);
      expect((staleUse.body as { error: { code: string } }).error.code).toBe('TOKEN_INVALID');
    });
  });

  describe('Change password', () => {
    it('changes the password and revokes refresh tokens', async () => {
      const account = await register();
      await request(app.getHttpServer())
        .post(`${base}/auth/change-password`)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .send({ currentPassword: strongPassword, newPassword: 'NewPass123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`${base}/auth/login`)
        .send({ email: account.email, password: strongPassword })
        .expect(401);
      await login(account.email, 'NewPass123!');
      await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: account.tokens.refreshToken })
        .expect(401);
    });

    it('rejects a wrong current password', async () => {
      const account = await register();
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/change-password`)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .send({ currentPassword: 'WrongPass1!', newPassword: 'NewPass123!' })
        .expect(401);
      expect((response.body as { error: { code: string } }).error.code).toBe('PASSWORD_INCORRECT');
    });
  });

  describe('Forgot & reset password', () => {
    it('issues a reset link and lets the user set a new password', async () => {
      const account = await register();
      await request(app.getHttpServer())
        .post(`${base}/auth/forgot-password`)
        .send({ email: account.email })
        .expect(200);

      const token = resetTokenFrom(account.email, 'Reset your Tedor password');
      await request(app.getHttpServer())
        .post(`${base}/auth/reset-password`)
        .send({ token, password: 'ResetPass123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`${base}/auth/login`)
        .send({ email: account.email, password: strongPassword })
        .expect(401);
      await login(account.email, 'ResetPass123!');
    });

    it('returns the same success for unknown emails (no enumeration)', async () => {
      const known = await register();
      const knownResult = await request(app.getHttpServer())
        .post(`${base}/auth/forgot-password`)
        .send({ email: known.email });
      const unknownResult = await request(app.getHttpServer())
        .post(`${base}/auth/forgot-password`)
        .send({ email: unique('ghost') });
      expect(knownResult.body).toEqual(unknownResult.body);
    });

    it('rejects an expired reset token', async () => {
      const account = await register();
      await request(app.getHttpServer())
        .post(`${base}/auth/forgot-password`)
        .send({ email: account.email })
        .expect(200);
      const token = resetTokenFrom(account.email, 'Reset your Tedor password');

      const record = await prisma.passwordResetToken.findFirst({ where: { user: { email: account.email } } });
      await prisma.passwordResetToken.update({
        where: { id: record!.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await request(app.getHttpServer())
        .post(`${base}/auth/reset-password`)
        .send({ token, password: 'ResetPass123!' })
        .expect(400);
      expect((response.body as { error: { code: string } }).error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('Role-based authorization', () => {
    it('protects admin endpoints from unauthenticated users', async () => {
      await request(app.getHttpServer()).get(`${base}/users`).expect(401);
    });

    it('denies CLIENT access to admin endpoints', async () => {
      const account = await register();
      await request(app.getHttpServer())
        .get(`${base}/users`)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .expect(403);
    });

    it('allows the seeded ADMIN/SUPER_ADMIN to list users', async () => {
      const admin = await login(seededAdmin.email, seededAdmin.password);
      const response = await request(app.getHttpServer())
        .get(`${base}/users?page=1&pageSize=50`)
        .set('Authorization', `Bearer ${admin.tokens.accessToken}`)
        .expect(200);
      const data = response.body as {
        data: { items: Array<{ id: string; email: string; role: string; status: string }>; pagination: { total: number } };
      };
      const dbTotal = await prisma.user.count();
      expect(data.data.pagination.total).toBe(dbTotal);
      expect(data.data.items.length).toBeGreaterThan(0);
      for (const item of data.data.items) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('email');
        expect(item).toHaveProperty('role');
      }
    });

    it('does not leak password hashes in admin listings', async () => {
      const admin = await login(seededAdmin.email, seededAdmin.password);
      const response = await request(app.getHttpServer())
        .get(`${base}/users`)
        .set('Authorization', `Bearer ${admin.tokens.accessToken}`)
        .expect(200);
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('disables an account via admin permission and revokes its sessions', async () => {
      const victim = await register();
      const admin = await login(seededAdmin.email, seededAdmin.password);

      await request(app.getHttpServer())
        .patch(`${base}/users/${(victim.user as { id: string }).id}/status`)
        .set('Authorization', `Bearer ${admin.tokens.accessToken}`)
        .send({ status: 'DISABLED' })
        .expect(200);

      const me = await request(app.getHttpServer())
        .get(`${base}/auth/me`)
        .set('Authorization', `Bearer ${victim.tokens.accessToken}`)
        .expect(403);
      expect((me.body as { error: { code: string } }).error.code).toBe('FORBIDDEN');

      const refresh = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken: victim.tokens.refreshToken })
        .expect(403);
      expect((refresh.body as { error: { code: string } }).error.code).toBe('ACCOUNT_DISABLED');
    });

    it('denies CLIENT attempts to change another user status', async () => {
      const account = await register();
      const admin = await login(seededAdmin.email, seededAdmin.password);
      const response = await request(app.getHttpServer())
        .patch(`${base}/users/${(admin.user as { id: string }).id}/status`)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .send({ status: 'DISABLED' })
        .expect(403);
      expect((response.body as { error: { code: string } }).error.code).toBe('FORBIDDEN');
    });

    it('does not allow disabling your own account', async () => {
      const admin = await login(seededAdmin.email, seededAdmin.password);
      const response = await request(app.getHttpServer())
        .patch(`${base}/users/${(admin.user as { id: string }).id}/status`)
        .set('Authorization', `Bearer ${admin.tokens.accessToken}`)
        .send({ status: 'DISABLED' })
        .expect(400);
      expect((response.body as { error: { code: string } }).error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('Telegram linking foundation', () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;

    function buildInitData(user: { id: number; first_name: string; username?: string }, authDate = Math.floor(Date.now() / 1000)): string {
      const userJson = JSON.stringify(user);
      const pairs = [
        ['user', userJson],
        ['auth_date', String(authDate)],
        ['query_id', 'AAE-testquery'],
      ];
      const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
      const checkString = [...pairs]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      const hash = createHmac('sha256', secret).update(checkString).digest('hex');
      return [...pairs, ['hash', hash]]
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    }

    it('links a Telegram account after server-side verification', async () => {
      const account = await register();
      const initData = buildInitData({ id: 987654321, first_name: 'Tedi', username: 'tedi_bot' });
      await request(app.getHttpServer())
        .post(`${base}/auth/telegram/link`)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .send({ initData })
        .expect(200);

      const me = await request(app.getHttpServer())
        .get(`${base}/auth/me`)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .expect(200);
      expect((me.body as { data: { telegramLinked: boolean } }).data.telegramLinked).toBe(true);

      const user = await prisma.user.findUnique({ where: { email: account.email } });
      expect(user!.telegramId).toBe('987654321');
      expect(user!.telegramUsername).toBe('tedi_bot');
    });

    it('rejects tampered init data', async () => {
      const account = await register();
      const good = buildInitData({ id: 111111, first_name: 'Imposter' });
      const tampered = good.replace('111111', '222222');
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/telegram/link`)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .send({ initData: tampered })
        .expect(400);
      expect((response.body as { error: { code: string } }).error.code).toBe('TELEGRAM_BAD_INIT');
    });

    it('rejects expired authentication data', async () => {
      const account = await register();
      const stale = buildInitData({ id: 333333, first_name: 'Old' }, Math.floor(Date.now() / 1000) - 90_000);
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/telegram/link`)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .send({ initData: stale })
        .expect(400);
      expect((response.body as { error: { code: string } }).error.code).toBe('TELEGRAM_BAD_INIT');
    });

    it('rejects linking an already-linked Telegram account from another user', async () => {
      const first = await register();
      const initData = buildInitData({ id: 555555, first_name: 'Taken' });
      await request(app.getHttpServer())
        .post(`${base}/auth/telegram/link`)
        .set('Authorization', `Bearer ${first.tokens.accessToken}`)
        .send({ initData })
        .expect(200);

      const second = await register();
      const response = await request(app.getHttpServer())
        .post(`${base}/auth/telegram/link`)
        .set('Authorization', `Bearer ${second.tokens.accessToken}`)
        .send({ initData })
        .expect(409);
      expect((response.body as { error: { code: string } }).error.code).toBe('TELEGRAM_ALREADY_LINKED');
    });
  });

  describe('Rate limiting', () => {
    it('throttles login attempts', async () => {
      const email = unique('throttled');
      const statuses: number[] = [];
      for (let i = 0; i < 31; i += 1) {
        const response = await request(app.getHttpServer())
          .post(`${base}/auth/login`)
          .send({ email, password: 'SomePassword1!' });
        statuses.push(response.status);
      }
      expect(statuses).toContain(429);
    });

    it('throttles verification resends', async () => {
      const email = unique('resend-throttled');
      const statuses: number[] = [];
      for (let i = 0; i < 6; i += 1) {
        const response = await request(app.getHttpServer())
          .post(`${base}/auth/resend-verification`)
          .send({ email });
        statuses.push(response.status);
      }
      expect(statuses).toContain(429);
    });
  });
});