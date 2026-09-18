import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { UserRoleName } from '@prisma/client';
import { CurrentUser, Roles, type AuthenticatedUser } from '../common/auth.decorators';
import { SelectionService } from './selection.service';

/**
 * Client-facing endpoints for tutor selection.
 * Route: POST /api/v1/matches/:id/select
 */
@Controller('matches')
@Roles(UserRoleName.CLIENT)
export class SelectionController {
  constructor(private readonly selection: SelectionService) {}

  @Post(':id/select')
  @HttpCode(HttpStatus.OK)
  selectMatch(@CurrentUser() user: AuthenticatedUser, @Param('id') matchId: string) {
    return this.selection.selectMatch(user.userId, matchId);
  }
}
