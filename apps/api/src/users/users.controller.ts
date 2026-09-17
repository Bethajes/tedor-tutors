import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { CurrentUser, Permissions, Roles, type AuthenticatedUser } from '../common/auth.decorators';
import { UserRoleName } from '@prisma/client';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@Controller('users')
@Roles(UserRoleName.COORDINATOR, UserRoleName.ADMIN, UserRoleName.SUPER_ADMIN)
@Permissions('admin.users.read')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
  ) {
    return this.users.list(page, pageSize);
  }

  @Patch(':userId/status')
  @HttpCode(200)
  @Permissions('admin.users.write')
  updateStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.users.updateStatus(actor, userId, dto.status);
  }
}