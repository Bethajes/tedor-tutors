import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from '@tedor/api-client';
import Constants from 'expo-constants';

const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:4000';

const ACCESS_KEY = 'tedor_access_token';
const REFRESH_KEY = 'tedor_refresh_token';

export const storage = {
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(ACCESS_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.multiSet([
      [ACCESS_KEY, accessToken],
      [REFRESH_KEY, refreshToken],
    ]);
  },
  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  },
};

export const api = new ApiClient({
  baseUrl: BASE_URL,
  getAccessToken: () => storage.getAccessToken(),
  getRefreshToken: () => storage.getRefreshToken(),
  onTokensRefreshed: (tokens) => storage.setTokens(tokens.accessToken, tokens.refreshToken),
  onSessionExpired: () => {
    void storage.clear();
  },
});