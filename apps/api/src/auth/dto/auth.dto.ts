import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum SelfRegistrableRole {
  CLIENT = 'CLIENT',
  TUTOR = 'TUTOR',
}

const toLowerCase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.toLowerCase().trim() : value;

const toPhoneOrNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export class RegisterDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @Transform(toLowerCase)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @Transform(toPhoneOrNull)
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Enter a valid phone in E.164 format (e.g. +380501234567)' })
  phone?: string;

  @IsString()
  @Length(8, 128)
  @Matches(/[a-zA-Z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a digit' })
  password!: string;

  @IsEnum(SelfRegistrableRole)
  role!: SelfRegistrableRole;
}

export class LoginDto {
  @Transform(toLowerCase)
  @IsEmail()
  email!: string;

  @IsString()
  @Length(1, 128)
  password!: string;
}

export class RefreshDto {
  @IsString()
  @Length(1, 2048)
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  @Length(1, 2048)
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @Transform(toLowerCase)
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @Length(1, 2048)
  token!: string;

  @IsString()
  @Length(8, 128)
  @Matches(/[a-zA-Z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a digit' })
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  @Length(1, 2048)
  token!: string;
}

export class ResendVerificationDto {
  @Transform(toLowerCase)
  @IsEmail()
  email!: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(1, 128)
  currentPassword!: string;

  @IsString()
  @Length(8, 128)
  @Matches(/[a-zA-Z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a digit' })
  newPassword!: string;
}

export class TelegramLinkDto {
  @IsString()
  @Length(1, 8192)
  initData!: string;
}