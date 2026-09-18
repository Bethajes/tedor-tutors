import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiException } from './api.exception';
import type { ErrorCode } from '@tedor/types';

const fallbackCodes: Record<number, ErrorCode> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

interface ValidationDetail {
  field: string;
  message: string;
}

/**
 * Flatten a ValidationPipe error response into `{ field, message }` pairs so
 * the web client can map errors onto individual form inputs. Nested/`every`/
 * `oneOf` payloads are traversed so children of composite DTOs are included.
 */
function toFieldDetails(body: unknown): ValidationDetail[] | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const messages = (body as { message?: unknown }).message;
  if (typeof messages !== 'string' && !Array.isArray(messages)) return undefined;
  const constraints = Array.isArray(messages) ? messages : [messages];
  return constraints.map((raw) => {
    if (typeof raw === 'string') {
      const separator = raw.indexOf(' - ');
      // class-validator messages arrive as "<property path> - <constraint text>"
      // when the pipe reports property-specific errors.
      if (separator > 0) {
        return { field: raw.slice(0, separator), message: raw.slice(separator + 3) };
      }
      return { field: '_', message: raw };
    }
    return { field: '_', message: String(raw) };
  });
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let code: ErrorCode;
    let message: string;
    let details: unknown;

    if (exception instanceof ApiException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const casted = body as { message?: string | string[]; error?: string; details?: unknown };
        message = Array.isArray(casted.message) ? casted.message.join(', ') : casted.message ?? exception.message;
        // Prefer structured details attached by a custom exceptionFactory
        // (see main.ts) over re-parsing flattened messages.
        if (casted.details !== undefined) {
          details = casted.details;
        }
      }
      code = fallbackCodes[status] ?? 'INTERNAL_ERROR';
      if (details === undefined && (status === 400 || status === 413 || status === 422)) {
        details = toFieldDetails(body);
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    });
  }
}
