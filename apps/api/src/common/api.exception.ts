import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@tedor/types';

interface ApiExceptionOptions {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export class ApiException extends HttpException {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: HttpStatus, options: ApiExceptionOptions) {
    super(options.message, status);
    this.code = options.code;
    this.details = options.details;
  }

  static from(status: HttpStatus, code: ErrorCode, message: string, details?: unknown): ApiException {
    return new ApiException(status, { code, message, details });
  }
}