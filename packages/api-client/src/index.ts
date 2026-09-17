import type {
  ApiFailure,
  ApiResponse,
  AuthTokens,
  ChangePasswordRequest,
  ClientProfile,
  CreateLearnerRequest,
  Learner,
  LearnerList,
  PublicUser,
  RegisterRequest,
  SessionInfo,
  UpdateClientProfileRequest,
  UpdateLearnerRequest,
} from '@tedor/types';

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  getRefreshToken?: () => string | null | Promise<string | null>;
  onTokensRefreshed?: (tokens: AuthTokens) => void | Promise<void>;
  onSessionExpired?: () => void;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Thrown when the API itself could not be reached — network down, connection
 * refused, DNS failure — as opposed to an HTTP error response from the API.
 * The frontend can use this to show "can't reach the server" copy instead of
 * blaming the user's input.
 */
export class ApiConnectionError extends Error {
  constructor(cause?: unknown) {
    super('Cannot reach the Tedor API. Check your connection and try again.');
    this.name = 'ApiConnectionError';
    if (cause !== undefined) this.cause = cause;
  }
}

export interface ResponseMeta {
  rateLimit?: { limit: number; remaining: number; reset: number };
  [key: string]: unknown;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly options: ApiClientOptions;
  private refreshPromise: Promise<string> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.options = options;
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<{ data: T; meta: ResponseMeta }> {
    const { method = 'GET', body, auth = false } = opts;
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (auth) {
      const token = await this.options.getAccessToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;
      else throw new ApiError(401, 'UNAUTHORIZED', 'No access token available');
    }
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      // fetch only rejects for network-level failures (connection refused,
      // DNS, CORS block, offline); HTTP error statuses still resolve.
      throw new ApiConnectionError(error);
    }

    const meta: ResponseMeta = {};
    const rateHeaders = [
      'ratelimit-limit',
      'ratelimit-remaining',
      'ratelimit-reset',
    ];
    if (rateHeaders.every((h) => response.headers.get(h))) {
      meta.rateLimit = {
        limit: Number(response.headers.get('ratelimit-limit')),
        remaining: Number(response.headers.get('ratelimit-remaining')),
        reset: Number(response.headers.get('ratelimit-reset')),
      };
    }

    const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

    if (response.status === 401 && auth && payload?.success === false && payload.error.code === 'TOKEN_EXPIRED') {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        return this.request<T>(path, opts);
      }
    }

    if (!payload || !payload.success) {
      const error = payload as ApiFailure | null;
      throw new ApiError(
        response.status,
        error?.error.code ?? 'INTERNAL_ERROR',
        error?.error.message ?? this.messageForStatus(response.status),
        error?.error.details,
      );
    }

    return { data: payload.data, meta };
  }

  private messageForStatus(status: number): string {
    if (status === 401) return 'Unauthorized';
    if (status === 403) return 'Forbidden';
    if (status === 404) return 'Not found';
    if (status === 429) return 'Too many requests';
    if (status >= 500) return 'Server error';
    return 'Request failed';
  }

  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    try {
      await this.refreshPromise;
      return true;
    } catch {
      this.options.onSessionExpired?.();
      return false;
    }
  }

  private async doRefresh(): Promise<string> {
    const refreshToken =
      (await this.options.getRefreshToken?.()) ??
      (typeof localStorage !== 'undefined' ? localStorage.getItem('tedor_refresh_token') : null);
    if (!refreshToken) throw new ApiError(401, 'UNAUTHORIZED', 'No refresh token available');

    const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const payload = (await response.json().catch(() => null)) as ApiResponse<AuthTokens> | null;

    if (!response.ok || !payload?.success) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('tedor_access_token');
        localStorage.removeItem('tedor_refresh_token');
      }
      throw new ApiError(response.status, 'TOKEN_INVALID', 'Refresh failed');
    }

    const tokens = payload.data;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tedor_access_token', tokens.accessToken);
      localStorage.setItem('tedor_refresh_token', tokens.refreshToken);
    }
    await this.options.onTokensRefreshed?.(tokens);
    return tokens.accessToken;
  }

  private async raw<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { data } = await this.request<T>(path, opts);
    return data;
  }

  register(input: RegisterRequest): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    return this.raw('/auth/register', { method: 'POST', body: input });
  }

  login(input: { email: string; password: string }): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    return this.raw('/auth/login', { method: 'POST', body: input });
  }

  refresh(refreshToken: string): Promise<AuthTokens> {
    return this.raw('/auth/refresh', { method: 'POST', body: { refreshToken } });
  }

  logout(refreshToken: string): Promise<{ success: true }> {
    return this.raw('/auth/logout', { method: 'POST', body: { refreshToken } });
  }

  me(): Promise<PublicUser> {
    return this.raw('/auth/me', { auth: true });
  }

  changePassword(input: ChangePasswordRequest): Promise<{ success: true }> {
    return this.raw('/auth/change-password', { method: 'POST', body: input, auth: true });
  }

  forgotPassword(email: string): Promise<{ success: true }> {
    return this.raw('/auth/forgot-password', { method: 'POST', body: { email } });
  }

  resetPassword(token: string, password: string): Promise<{ success: true }> {
    return this.raw('/auth/reset-password', { method: 'POST', body: { token, password } });
  }

  verifyEmail(token: string): Promise<{ success: true }> {
    return this.raw('/auth/verify-email', { method: 'POST', body: { token } });
  }

  resendVerification(email: string): Promise<{ success: true }> {
    return this.raw('/auth/resend-verification', { method: 'POST', body: { email } });
  }

  linkTelegram(initData: string): Promise<{ success: true }> {
    return this.raw('/auth/telegram/link', { method: 'POST', body: { initData }, auth: true });
  }

  meSessions(): Promise<{ sessions: SessionInfo[] }> {
    return this.raw('/auth/sessions', { auth: true });
  }

  logoutSession(sessionId: string): Promise<{ success: true }> {
    return this.raw(`/auth/sessions/${sessionId}`, { method: 'DELETE', auth: true });
  }

  getClientProfile(): Promise<ClientProfile> {
    return this.raw('/client/profile', { auth: true });
  }

  updateClientProfile(input: UpdateClientProfileRequest): Promise<ClientProfile> {
    return this.raw('/client/profile', { method: 'PATCH', body: input, auth: true });
  }

  uploadClientProfilePhoto(photo: Blob, filename: string): Promise<{ photoUrl: string }> {
    const form = new FormData();
    form.append('photo', photo, filename);
    return this.requestForm<{ photoUrl: string }>('/client/profile/photo', form).then(({ data }) => data);
  }

  listLearners(): Promise<LearnerList> {
    return this.raw('/client/learners', { auth: true });
  }

  createLearner(input: CreateLearnerRequest): Promise<Learner> {
    return this.raw('/client/learners', { method: 'POST', body: input, auth: true });
  }

  getLearner(learnerId: string): Promise<Learner> {
    return this.raw(`/client/learners/${learnerId}`, { auth: true });
  }

  updateLearner(learnerId: string, input: UpdateLearnerRequest): Promise<Learner> {
    return this.raw(`/client/learners/${learnerId}`, { method: 'PATCH', body: input, auth: true });
  }

  deleteLearner(learnerId: string): Promise<{ success: true }> {
    return this.raw(`/client/learners/${learnerId}`, { method: 'DELETE', auth: true });
  }

  private async requestForm<T>(path: string, form: FormData): Promise<{ data: T; meta: ResponseMeta }> {
    const token = await this.options.getAccessToken?.();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else throw new ApiError(401, 'UNAUTHORIZED', 'No access token available');

    const response = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method: 'POST',
      headers,
      body: form,
    });
    const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
    if (!payload || !payload.success) {
      const error = payload as ApiFailure | null;
      throw new ApiError(
        response.status,
        error?.error.code ?? 'INTERNAL_ERROR',
        error?.error.message ?? this.messageForStatus(response.status),
        error?.error.details,
      );
    }
    return { data: payload.data, meta: {} };
  }
}