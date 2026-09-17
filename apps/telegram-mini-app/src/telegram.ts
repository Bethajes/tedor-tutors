import { ApiClient } from '@tedor/api-client';

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
    auth_date?: number;
    hash?: string;
    query_id?: string;
  };
  ready: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function isRunningInsideTelegram(): boolean {
  const webApp = getTelegramWebApp();
  return Boolean(webApp && webApp.initData && webApp.initData.length > 0);
}

export const api = new ApiClient({
  baseUrl: '',
  getAccessToken: () => localStorage.getItem('tedor_access_token'),
  getRefreshToken: () => localStorage.getItem('tedor_refresh_token'),
  onTokensRefreshed: (tokens) => {
    localStorage.setItem('tedor_access_token', tokens.accessToken);
    localStorage.setItem('tedor_refresh_token', tokens.refreshToken);
  },
  onSessionExpired: () => {
    localStorage.removeItem('tedor_access_token');
    localStorage.removeItem('tedor_refresh_token');
  },
});