import type { PublicUser, UserRole } from '@tedor/types';

export const ROLE_HOME: Record<UserRole, 'dashboard' | 'admin'> = {
  CLIENT: 'dashboard',
  TUTOR: 'dashboard',
  COORDINATOR: 'dashboard',
  ADMIN: 'admin',
  SUPER_ADMIN: 'admin',
};

export type Screen =
  | { name: 'boot' }
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'forgot-password' }
  | { name: 'reset-password' }
  | { name: 'verify-email' }
  | { name: 'dashboard' }
  | { name: 'admin' };

export interface Session {
  user: PublicUser;
  screen: Screen;
}

export function homeScreenFor(user: PublicUser): Screen {
  return { name: user.emailVerified ? ROLE_HOME[user.role] : 'verify-email' };
}