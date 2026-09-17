import { Test } from '@nestjs/testing';
import { ClientService } from './client.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClientService', () => {
  let service: ClientService;
  let prisma: {
    clientProfile: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    learner: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const userId = 'user-1';
  const profileId = 'profile-1';

  const profileRecord = {
    id: profileId,
    userId,
    firstName: 'Ada',
    lastName: 'Lovelace',
    photoUrl: null,
    phone: null,
    preferredLanguage: null,
    location: null,
    address: null,
    bio: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const userRecord = {
    id: userId,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: null,
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const learnerRecord = {
    id: 'learner-1',
    clientProfileId: profileId,
    firstName: 'Grace',
    lastName: 'Hopper',
    dateOfBirth: new Date('2015-04-01T00:00:00Z'),
    gender: 'FEMALE',
    grade: 'Grade 4',
    school: null,
    curriculum: null,
    subjects: ['Math'],
    goals: null,
    preferredLanguage: null,
    notes: null,
    deletedAt: null,
    createdAt: new Date('2026-01-05T00:00:00Z'),
    updatedAt: new Date('2026-01-05T00:00:00Z'),
  };

  const mockDelegate = () => ({
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClientService,
        {
          provide: PrismaService,
          useValue: {
            clientProfile: mockDelegate(),
            user: mockDelegate(),
            learner: mockDelegate(),
          },
        },
      ],
    }).compile();

    service = module.get(ClientService);
    prisma = module.get(PrismaService) as never;
  });

  describe('getProfile', () => {
    it('auto-creates a profile from the user name when none exists', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(userRecord);
      prisma.clientProfile.create.mockResolvedValue(profileRecord);
      prisma.user.findUniqueOrThrow.mockResolvedValue(userRecord);

      const result = await service.getProfile(userId);

      expect(prisma.clientProfile.create).toHaveBeenCalledWith({
        data: { userId, firstName: 'Ada', lastName: 'Lovelace' },
      });
      expect(result.firstName).toBe('Ada');
      expect(result.user.email).toBe('ada@example.com');
      expect(result.user.emailVerified).toBe(true);
    });

    it('throws 404 when the user record is missing during lazy creation', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('updateProfile', () => {
    it('updates only provided fields and returns the serialized profile', async () => {
      const updated = { ...profileRecord, phone: '+12025550123' };
      prisma.clientProfile.findUnique.mockResolvedValue(updated);
      prisma.clientProfile.update.mockResolvedValue(updated);
      prisma.user.findUniqueOrThrow.mockResolvedValue(userRecord);

      const result = await service.updateProfile(userId, { phone: '+12025550123' });

      expect(prisma.clientProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: { phone: '+12025550123' },
      });
      expect(result.phone).toBe('+12025550123');
    });

    it('clears nullable fields when null is sent', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(profileRecord);
      prisma.clientProfile.update.mockResolvedValue({ ...profileRecord, bio: null });
      prisma.user.findUniqueOrThrow.mockResolvedValue(userRecord);

      await service.updateProfile(userId, { bio: null });

      expect(prisma.clientProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: { bio: null },
      });
    });
  });

  describe('uploadPhoto', () => {
    it('rejects when no file is provided', async () => {
      await expect(service.uploadPhoto(userId, undefined)).rejects.toMatchObject({ status: 400 });
    });

    it('rejects unsupported mime types', async () => {
      const file = { buffer: Buffer.from('x'), mimetype: 'text/plain', size: 5 };
      await expect(service.uploadPhoto(userId, file)).rejects.toMatchObject({ status: 400 });
    });

    it('rejects files larger than 5MB', async () => {
      const file = {
        buffer: Buffer.alloc(5_000_001),
        mimetype: 'image/png',
        size: 5_000_001,
      };
      await expect(service.uploadPhoto(userId, file)).rejects.toMatchObject({ status: 400 });
    });

    it('stores the photo as a base64 data URI', async () => {
      const buffer = Buffer.from('fake-image-bytes');
      prisma.clientProfile.findUnique.mockResolvedValue(profileRecord);
      prisma.clientProfile.update.mockResolvedValue(profileRecord);

      const result = await service.uploadPhoto(userId, {
        buffer,
        mimetype: 'image/png',
        size: buffer.length,
      });

      expect(prisma.clientProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: { photoUrl: `data:image/png;base64,${buffer.toString('base64')}` },
      });
      expect(result.photoUrl).toContain('data:image/png;base64,');
    });
  });

  describe('learners', () => {
    it('lists only non-deleted learners ordered by creation time', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(profileRecord);
      prisma.learner.findMany.mockResolvedValue([learnerRecord]);

      const result = await service.listLearners(userId);

      expect(prisma.learner.findMany).toHaveBeenCalledWith({
        where: { clientProfileId: profileId, deletedAt: null },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      expect(result.items[0].firstName).toBe('Grace');
      expect(result.items[0].age).toBeGreaterThan(0);
    });

    it('creates a learner under the client profile', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(profileRecord);
      prisma.learner.create.mockResolvedValue(learnerRecord);

      const result = await service.createLearner(userId, {
        firstName: 'Grace',
        lastName: 'Hopper',
        subjects: ['Math'],
      });

      expect(prisma.learner.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientProfileId: profileId,
          firstName: 'Grace',
          subjects: ['Math'],
        }),
      });
      expect(result.id).toBe('learner-1');
    });

    it('rejects a future date of birth', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(profileRecord);
      const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
      await expect(
        service.createLearner(userId, { firstName: 'Grace', lastName: 'Hopper', dateOfBirth: future }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('fetches a learner owned by the client', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(profileRecord);
      prisma.learner.findFirst.mockResolvedValue(learnerRecord);

      const result = await service.getLearner(userId, 'learner-1');

      expect(prisma.learner.findFirst).toHaveBeenCalledWith({
        where: { id: 'learner-1', clientProfileId: profileId, deletedAt: null },
      });
      expect(result.id).toBe('learner-1');
    });

    it('returns 404 when the learner belongs to another client', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(profileRecord);
      prisma.learner.findFirst.mockResolvedValue(null);

      await expect(service.getLearner(userId, 'other-client-learner')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('updates a learner scoped to the owning profile', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(profileRecord);
      prisma.learner.findFirst.mockResolvedValue(learnerRecord);
      prisma.learner.update.mockResolvedValue({ ...learnerRecord, grade: 'Grade 5' });

      const result = await service.updateLearner(userId, 'learner-1', { grade: 'Grade 5' });

      expect(prisma.learner.findFirst).toHaveBeenCalledWith({
        where: { id: 'learner-1', clientProfileId: profileId, deletedAt: null },
      });
      expect(result.grade).toBe('Grade 5');
    });

    it('soft-deletes a learner owned by the client', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(profileRecord);
      prisma.learner.findFirst.mockResolvedValue(learnerRecord);
      prisma.learner.update.mockResolvedValue(learnerRecord);

      const result = await service.deleteLearner(userId, 'learner-1');

      expect(prisma.learner.update).toHaveBeenCalledWith({
        where: { id: 'learner-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.success).toBe(true);
    });

    it('returns 404 when deleting another client learner', async () => {
      prisma.clientProfile.findUnique.mockResolvedValue(profileRecord);
      prisma.learner.findFirst.mockResolvedValue(null);

      await expect(service.deleteLearner(userId, 'not-mine')).rejects.toMatchObject({ status: 404 });
    });
  });
});