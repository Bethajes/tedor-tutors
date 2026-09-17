import { IsEnum } from 'class-validator';

export enum UserStatusAction {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatusAction)
  status!: UserStatusAction;
}