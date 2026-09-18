import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRoleName } from '@prisma/client';
import { CurrentUser, Roles, type AuthenticatedUser } from '../common/auth.decorators';
import { ClientService, type UploadedPhotoFile } from './client.service';
import { UpdateClientProfileDto } from './dto/client-profile.dto';
import { CreateLearnerDto, ListLearnersQueryDto, UpdateLearnerDto } from './dto/learner.dto';

@Controller('client')
@Roles(UserRoleName.CLIENT)
export class ClientController {
  constructor(private readonly client: ClientService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.client.getProfile(user.userId);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.client.getDashboard(user.userId);
  }

  @Patch('profile')
  @HttpCode(200)
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateClientProfileDto) {
    return this.client.updateProfile(user.userId, dto);
  }

  @Post('profile/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 6_000_000, files: 1 },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedPhotoFile,
  ) {
    return this.client.uploadPhoto(user.userId, file);
  }

  @Get('learners')
  listLearners(@CurrentUser() user: AuthenticatedUser, @Query() query: ListLearnersQueryDto) {
    return this.client.listLearners(user.userId, query);
  }

  @Post('learners')
  createLearner(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLearnerDto) {
    return this.client.createLearner(user.userId, dto);
  }

  @Get('learners/:learnerId')
  getLearner(@CurrentUser() user: AuthenticatedUser, @Param('learnerId') learnerId: string) {
    return this.client.getLearner(user.userId, learnerId);
  }

  @Patch('learners/:learnerId')
  @HttpCode(200)
  updateLearner(
    @CurrentUser() user: AuthenticatedUser,
    @Param('learnerId') learnerId: string,
    @Body() dto: UpdateLearnerDto,
  ) {
    return this.client.updateLearner(user.userId, learnerId, dto);
  }

  @Delete('learners/:learnerId')
  @HttpCode(200)
  deleteLearner(@CurrentUser() user: AuthenticatedUser, @Param('learnerId') learnerId: string) {
    return this.client.deleteLearner(user.userId, learnerId);
  }
}