import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { UserRoleName } from '@prisma/client';
import { CurrentUser, Roles, type AuthenticatedUser } from '../common/auth.decorators';
import { SelectionService } from './selection.service';

/**
 * Tutor-facing endpoints for opportunity management.
 * Routes under: /api/v1/tutor/opportunities
 */
@Controller('tutor/opportunities')
@Roles(UserRoleName.TUTOR)
export class OpportunitiesController {
  constructor(private readonly selection: SelectionService) {}

  @Get()
  listOpportunities(@CurrentUser() user: AuthenticatedUser) {
    return this.selection.listOpportunities(user.userId);
  }

  @Get(':id')
  getOpportunity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.selection.getOpportunity(user.userId, id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  acceptOpportunity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.selection.acceptOpportunity(user.userId, id);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  declineOpportunity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.selection.declineOpportunity(user.userId, id);
  }
}
