import { CanActivate, ExecutionContext, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../common/auth.decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  override handleRequest<TUser>(err: unknown, user: TUser | false, info: unknown): TUser {
    if (err) {
      if (err instanceof HttpException) throw err;
      throw new UnauthorizedException('Invalid or expired access token');
    }
    if (!user) {
      throw info instanceof Error
        ? new UnauthorizedException('Invalid or expired access token')
        : new UnauthorizedException('Authentication required');
    }
    return user;
  }
}