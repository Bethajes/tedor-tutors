import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../common/api.exception';
import { safeEqual } from '../common/crypto.utils';

export interface TelegramUserPayload {
  id: string;
  firstName: string;
  username: string | null;
}

const TELEGRAM_BOT_TOKEN_PATTERN = /^[0-9]+:[A-Za-z0-9_-]{20,}$/;

@Injectable()
export class TelegramService {
  private readonly secret: Buffer | null;

  constructor(config: ConfigService) {
    const botToken = config.get<string>('app.telegramBotToken') ?? '';
    this.secret = TELEGRAM_BOT_TOKEN_PATTERN.test(botToken)
      ? createHmac('sha256', 'WebAppData').update(botToken).digest()
      : null;
  }

  isConfigured(): boolean {
    return this.secret !== null;
  }

  verify(initData: string, maxAgeSeconds = 86400): TelegramUserPayload {
    if (!this.secret) {
      throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, {
        code: 'TELEGRAM_BAD_INIT',
        message: 'Telegram linking is not configured on the server',
      });
    }

    let pairs: Array<[string, string]>;
    try {
      pairs = initData
        .split('&')
        .map((part) => {
          const [rawKey, ...rawValue] = part.split('=');
          return [decodeURIComponent(rawKey), decodeURIComponent(rawValue.join('='))];
        });
    } catch {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'TELEGRAM_BAD_INIT',
        message: 'Malformed Telegram authentication data',
      });
    }

    const hashEntry = pairs.find(([key]) => key === 'hash');
    if (!hashEntry) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'TELEGRAM_BAD_INIT',
        message: 'Telegram authentication data is missing its hash',
      });
    }

    const dataCheckString = pairs
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const computedHash = createHmac('sha256', this.secret).update(dataCheckString).digest('hex');
    if (!safeEqual(computedHash, hashEntry[1])) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'TELEGRAM_BAD_INIT',
        message: 'Telegram authentication data signature is invalid',
      });
    }

    const authDate = Number(pairs.find(([key]) => key === 'auth_date')?.[1] ?? 0);
    if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'TELEGRAM_BAD_INIT',
        message: 'Telegram authentication data has expired',
      });
    }

    const userEntry = pairs.find(([key]) => key === 'user');
    if (!userEntry) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'TELEGRAM_BAD_INIT',
        message: 'Telegram authentication data does not include a user',
      });
    }

    let user: { id?: string | number; username?: string; first_name?: string };
    try {
      user = JSON.parse(userEntry[1]) as typeof user;
    } catch {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'TELEGRAM_BAD_INIT',
        message: 'Telegram user payload is malformed',
      });
    }

    if (!user.id) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: 'TELEGRAM_BAD_INIT',
        message: 'Telegram user payload is missing an id',
      });
    }

    return {
      id: String(user.id),
      firstName: user.first_name ?? '',
      username: user.username ?? null,
    };
  }
}