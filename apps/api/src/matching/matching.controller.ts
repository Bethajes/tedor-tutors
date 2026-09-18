import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { UserRoleName } from '@prisma/client';
import { CurrentUser, Roles, type AuthenticatedUser } from '../common/auth.decorators';
import { MATCHING_CONFIG } from './matching.config';
import { MatchingService } from './matching.service';

@Controller('tutor-requests')
@Roles(UserRoleName.CLIENT, UserRoleName.COORDINATOR, UserRoleName.ADMIN, UserRoleName.SUPER_ADMIN)
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get(':id')
  getTutorRequest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.matching.getTutorRequest(user.userId, user.roleName, id);
  }

  @Get(':id/eligible-tutors')
  findEligibleTutors(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.matching.findEligibleTutors(user.userId, user.roleName, id);
  }

  @Get(':id/matches')
  listMatches(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.matching.listMatches(user.userId, user.roleName, id);
  }

  @Post(':id/matches')
  @HttpCode(HttpStatus.OK)
  generateMatches(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Number(limit) : NaN;
    const safeLimit =
      Number.isInteger(parsed) && parsed > 0 && parsed <= MATCHING_CONFIG.MAX_RESULT_LIMIT
        ? parsed
        : undefined;
    return this.matching.generateMatches(user.userId, user.roleName, id, safeLimit);
  }
}