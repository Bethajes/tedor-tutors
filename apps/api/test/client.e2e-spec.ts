import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://tedor:tedor_test_password@localhost:5433/tedor_test?schema=public';

const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });

describe('Client API (e2e)', () => {
  let app: INestApplication;

  const base = '/api/v1';
  const strongPassword = 'Test1234!';

  const unique = (prefix: string): string =>
    `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
  const phone = (): string =>
    `+1202${Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join('')}`;

  interface Tokens {
    accessToken: string;
    refreshToken: string;
  }

  async function registerAndLogin(role: 'CLIENT' | 'TUTOR' = 'CLIENT') {
    const email = unique('clitest');
    const registerResponse = await request(app.getHttpServer())
      .post(`${base}/auth/register`)
      .send({ name: 'Client Tester', email, password: strongPassword, role })
      .expect(201);
    const tokens = (registerResponse.body as { data: { tokens: Tokens } }).data.tokens;
    return { email, password: strongPassword, tokens, id: registerResponse.body.data.user.id as string };
  }

  const auth = (tokens: Tokens) => `Bearer ${tokens.accessToken}`;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('Profile', () => {
    it('auto-creates a profile on first GET', async () => {
      const client = await registerAndLogin();

      const getResponse = await request(app.getHttpServer())
        .get(`${base}/client/profile`)
        .set('Authorization', auth(client.tokens))
        .expect(200);

      const data = (getResponse.body as { data: unknown }).data as {
        firstName: string;
        lastName: string;
        user: { email: string; status: string };
      };
      expect(data.firstName).toBe('Client');
      expect(data.lastName).toBe('Tester');
      expect(data.user.email).toBe(client.email);
      expect(data.user.status).toBe('PENDING_VERIFICATION');
    });

    it('updates profile fields and returns the new state', async () => {
      const client = await registerAndLogin();

      const patchResponse = await request(app.getHttpServer())
        .patch(`${base}/client/profile`)
        .set('Authorization', auth(client.tokens))
        .send({
          phone: phone(),
          preferredLanguage: 'English',
          location: 'Kyiv',
          bio: 'Looking for a math tutor.',
        })
        .expect(200);

      const data = (patchResponse.body as { data: unknown }).data as { bio: string; location: string };
      expect(data.bio).toBe('Looking for a math tutor.');
      expect(data.location).toBe('Kyiv');
    });

    it('clears a field when empty string is sent', async () => {
      const client = await registerAndLogin();
      await request(app.getHttpServer())
        .patch(`${base}/client/profile`)
        .set('Authorization', auth(client.tokens))
        .send({ location: 'Kyiv' })
        .expect(200);

      const cleared = await request(app.getHttpServer())
        .patch(`${base}/client/profile`)
        .set('Authorization', auth(client.tokens))
        .send({ location: '' })
        .expect(200);
      expect((cleared.body as { data: { location: string | null } }).data.location).toBeNull();
    });

    it('rejects an invalid phone format', async () => {
      const client = await registerAndLogin();
      await request(app.getHttpServer())
        .patch(`${base}/client/profile`)
        .set('Authorization', auth(client.tokens))
        .send({ phone: '12345' })
        .expect(400);
    });

    describe('Photo upload', () => {
      it('stores a valid image upload as a data URI', async () => {
        const client = await registerAndLogin();
        const buffer = Buffer.from('%PNG-image-bytes');

        const uploadResponse = await request(app.getHttpServer())
          .post(`${base}/client/profile/photo`)
          .set('Authorization', auth(client.tokens))
          .attach('photo', buffer, { filename: 'photo.png', contentType: 'image/png' })
          .expect(201);

        const photoUrl = (uploadResponse.body as { data: { photoUrl: string } }).data.photoUrl;
        expect(photoUrl.startsWith('data:image/png;base64,')).toBe(true);

        const profile = await request(app.getHttpServer())
          .get(`${base}/client/profile`)
          .set('Authorization', auth(client.tokens))
          .expect(200);
        expect((profile.body as { data: { photoUrl: string } }).data.photoUrl).toBe(photoUrl);
      });

      it('rejects an unsupported file type', async () => {
        const client = await registerAndLogin();
        await request(app.getHttpServer())
          .post(`${base}/client/profile/photo`)
          .set('Authorization', auth(client.tokens))
          .attach('photo', Buffer.from('plain text'), { filename: 'photo.txt', contentType: 'text/plain' })
          .expect(400);
      });

      it('rejects multipart uploads without a file', async () => {
        const client = await registerAndLogin();
        await request(app.getHttpServer())
          .post(`${base}/client/profile/photo`)
          .set('Authorization', auth(client.tokens))
          .expect(400);
      });
    });
  });

  describe('Learners', () => {
    it('supports the full learner lifecycle', async () => {
      const client = await registerAndLogin();

      const createResponse = await request(app.getHttpServer())
        .post(`${base}/client/learners`)
        .set('Authorization', auth(client.tokens))
        .send({
          firstName: 'Grace',
          lastName: 'Hopper',
          dateOfBirth: '2015-04-01',
          gender: 'FEMALE',
          grade: 'Grade 4',
          subjects: ['Math', 'Science'],
        })
        .expect(201);

      const learner = (createResponse.body as { data: unknown }).data as {
        id: string;
        firstName: string;
        subjects: string[];
        age: number | null;
      };
      expect(learner.firstName).toBe('Grace');
      expect(learner.subjects).toEqual(['Math', 'Science']);
      expect(learner.age).toBeGreaterThan(0);

      const listResponse = await request(app.getHttpServer())
        .get(`${base}/client/learners`)
        .set('Authorization', auth(client.tokens))
        .expect(200);
      const items = (listResponse.body as { data: { items: unknown[] } }).data.items;
      expect(items).toHaveLength(1);

      const getResponse = await request(app.getHttpServer())
        .get(`${base}/client/learners/${learner.id}`)
        .set('Authorization', auth(client.tokens))
        .expect(200);
      expect((getResponse.body as { data: { id: string } }).data.id).toBe(learner.id);

      const updateResponse = await request(app.getHttpServer())
        .patch(`${base}/client/learners/${learner.id}`)
        .set('Authorization', auth(client.tokens))
        .send({ grade: 'Grade 5', subjects: ['Math'] })
        .expect(200);
      const updated = (updateResponse.body as { data: unknown }).data as { grade: string; subjects: string[] };
      expect(updated.grade).toBe('Grade 5');
      expect(updated.subjects).toEqual(['Math']);

      await request(app.getHttpServer())
        .delete(`${base}/client/learners/${learner.id}`)
        .set('Authorization', auth(client.tokens))
        .expect(200);

      await request(app.getHttpServer())
        .get(`${base}/client/learners/${learner.id}`)
        .set('Authorization', auth(client.tokens))
        .expect(404);

      const afterDelete = await request(app.getHttpServer())
        .get(`${base}/client/learners`)
        .set('Authorization', auth(client.tokens))
        .expect(200);
      expect((afterDelete.body as { data: { items: unknown[] } }).data.items).toHaveLength(0);
    });

    it('rejects learners with a future date of birth', async () => {
      const client = await registerAndLogin();
      await request(app.getHttpServer())
        .post(`${base}/client/learners`)
        .set('Authorization', auth(client.tokens))
        .send({ firstName: 'Future', lastName: 'Kid', dateOfBirth: '2999-01-01' })
        .expect(400);
    });

    it('rejects learners missing required fields', async () => {
      const client = await registerAndLogin();
      await request(app.getHttpServer())
        .post(`${base}/client/learners`)
        .set('Authorization', auth(client.tokens))
        .send({ lastName: 'OnlyLast' })
        .expect(400);
    });

    it('does not expose another client learner (404)', async () => {
      const owner = await registerAndLogin();
      const intruder = await registerAndLogin();

      const createResponse = await request(app.getHttpServer())
        .post(`${base}/client/learners`)
        .set('Authorization', auth(owner.tokens))
        .send({ firstName: 'Secret', lastName: 'Learner' })
        .expect(201);
      const learnerId = (createResponse.body as { data: { id: string } }).data.id;

      await request(app.getHttpServer())
        .get(`${base}/client/learners/${learnerId}`)
        .set('Authorization', auth(intruder.tokens))
        .expect(404);

      await request(app.getHttpServer())
        .patch(`${base}/client/learners/${learnerId}`)
        .set('Authorization', auth(intruder.tokens))
        .send({ grade: 'Hacked' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`${base}/client/learners/${learnerId}`)
        .set('Authorization', auth(intruder.tokens))
        .expect(404);

      const ownerRead = await request(app.getHttpServer())
        .get(`${base}/client/learners/${learnerId}`)
        .set('Authorization', auth(owner.tokens))
        .expect(200);
      expect((ownerRead.body as { data: { grade: string | null } }).data.grade).toBeNull();
    });

    it('requires an authenticated CLIENT role', async () => {
      await request(app.getHttpServer()).get(`${base}/client/profile`).expect(401);

      const tutor = await registerAndLogin('TUTOR');
      await request(app.getHttpServer())
        .get(`${base}/client/profile`)
        .set('Authorization', auth(tutor.tokens))
        .expect(403);

      await request(app.getHttpServer())
        .get(`${base}/client/learners`)
        .set('Authorization', auth(tutor.tokens))
        .expect(403);
    });

    it('supports search and pagination', async () => {
      const client = await registerAndLogin();
      for (const [firstName, lastName] of [['Grace', 'Hopper'], ['Alan', 'Turing']] as const) {
        await request(app.getHttpServer())
          .post(`${base}/client/learners`)
          .set('Authorization', auth(client.tokens))
          .send({ firstName, lastName })
          .expect(201);
      }

      const searched = await request(app.getHttpServer())
        .get(`${base}/client/learners?search=grace`)
        .set('Authorization', auth(client.tokens))
        .expect(200);
      expect((searched.body as { data: { items: unknown[]; total: number } }).data.total).toBe(1);

      const paged = await request(app.getHttpServer())
        .get(`${base}/client/learners?limit=1&offset=1`)
        .set('Authorization', auth(client.tokens))
        .expect(200);
      const page = (paged.body as { data: { items: unknown[]; total: number } }).data;
      expect(page.total).toBe(2);
      expect(page.items).toHaveLength(1);

      await request(app.getHttpServer())
        .get(`${base}/client/learners?limit=0`)
        .set('Authorization', auth(client.tokens))
        .expect(400);
    });

    it('rejects impossible calendar dates', async () => {
      const client = await registerAndLogin();
      await request(app.getHttpServer())
        .post(`${base}/client/learners`)
        .set('Authorization', auth(client.tokens))
        .send({ firstName: 'Impossible', lastName: 'Date', dateOfBirth: '2015-02-30' })
        .expect(400);
    });
  });

  describe('Dashboard', () => {
    it('returns profile, stats, and recent learners', async () => {
      const client = await registerAndLogin();
      await request(app.getHttpServer())
        .post(`${base}/client/learners`)
        .set('Authorization', auth(client.tokens))
        .send({ firstName: 'Grace', lastName: 'Hopper', subjects: ['Math', ' math ', ''] })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`${base}/client/dashboard`)
        .set('Authorization', auth(client.tokens))
        .expect(200);
      const data = (response.body as { data: unknown }).data as {
        profile: { firstName: string };
        stats: { totalLearners: number; subjectsCovered: number; profileCompleteness: number; emailVerified: boolean };
        recentLearners: Array<{ subjects: string[] }>;
      };
      expect(data.profile.firstName).toBe('Client');
      expect(data.stats.totalLearners).toBe(1);
      // Duplicate/blank subjects are normalized before storage.
      expect(data.stats.subjectsCovered).toBe(1);
      expect(data.recentLearners[0].subjects).toEqual(['Math']);
    });

    it('syncs the account name when the profile name changes', async () => {
      const client = await registerAndLogin();
      await request(app.getHttpServer())
        .patch(`${base}/client/profile`)
        .set('Authorization', auth(client.tokens))
        .send({ firstName: '  Ada  ', lastName: 'Lovelace' })
        .expect(200);

      const me = await request(app.getHttpServer())
        .get(`${base}/auth/me`)
        .set('Authorization', auth(client.tokens))
        .expect(200);
      expect((me.body as { data: { name: string } }).data.name).toBe('Ada Lovelace');
    });
  });
});