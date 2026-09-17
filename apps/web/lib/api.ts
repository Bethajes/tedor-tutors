import { ApiClient } from '@tedor/api-client';
import { tokenStorage } from './token-storage';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:4000');

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => tokenStorage.getAccessToken(),
  onTokensRefreshed: (tokens) => tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken),
  onSessionExpired: () => tokenStorage.clear(),
});