import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY, ROLES_KEY } from '../common/auth.decorators';

describe('PermissionsGuard', () => {
  function buildGuard(metadata: { roles?: string[]; permissions?: string[] }) {
    const reflector = new Reflector();
    const guard = new PermissionsGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: 'u1', email: 'a@b.c', roleName: 'CLIENT', permissions: ['auth.read.self'] },
        }),
      }),
    } as never;
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((metadataKey: unknown) => {
      if (metadataKey === ROLES_KEY) return metadata.roles;
      if (metadataKey === PERMISSIONS_KEY) return metadata.permissions;
      return undefined;
    });
    return { guard, context };
  }

  it('allows requests without role or permission metadata', () => {
    const { guard, context } = buildGuard({});
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies a user without the required role', () => {
    const { guard, context } = buildGuard({ roles: ['ADMIN'] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('denies a user missing a required permission', () => {
    const { guard, context } = buildGuard({ permissions: ['admin.users.read'] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows a user with the required permission', () => {
    const reflector = new Reflector();
    const guard = new PermissionsGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            userId: 'u1',
            email: 'a@b.c',
            roleName: 'COORDINATOR',
            permissions: ['auth.read.self', 'admin.users.read'],
          },
        }),
      }),
    } as never;
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((metadataKey: unknown) => {
      if (metadataKey === PERMISSIONS_KEY) return ['admin.users.read'];
      return undefined;
    });
    expect(guard.canActivate(context)).toBe(true);
  });
});

describe('TelegramService', () => {
  const botToken = '123456789:TESTTOKEN_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const service = new TelegramService({ get: () => botToken } as unknown as ConfigService);
  const now = Math.floor(Date.now() / 1000);

  function buildInitData(user: Record<string, unknown>, authDate = now, overrides: Record<string, string> = {}): string {
    const pairs = [
      ['user', JSON.stringify(user)],
      ['auth_date', String(authDate)],
      ['query_id', 'AAE-testquery'],
      ...Object.entries(overrides),
    ];
    const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const checkString = [...pairs]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const hash = createHmac('sha256', secret).update(checkString).digest('hex');
    return [...pairs, ['hash', hash]].map(([key, value]) => `${key}=${value}`).join('&');
  }

  it('verifies valid init data and returns the telegram user', () => {
    const result = service.verify(buildInitData({ id: 42, first_name: 'Tedi', username: 'tedi' }));
    expect(result).toEqual({ id: '42', firstName: 'Tedi', username: 'tedi' });
  });

  it('rejects init data with a tampered user id', () => {
    const good = buildInitData({ id: 42, first_name: 'Tedi' });
    const tampered = good.replace('"id":42', '"id":999');
    expect(() => service.verify(tampered)).toThrow(/signature is invalid/);
  });

  it('rejects expired auth_date', () => {
    expect(() => service.verify(buildInitData({ id: 42 }, now - 100_000))).toThrow(/expired/);
  });
});