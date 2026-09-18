import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum LearnerGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

const toNullableString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const MAX_SUBJECTS = 20;
const MAX_SUBJECT_LENGTH = 120;

export class CreateLearnerDto {
  @IsString()
  @Length(1, 120)
  firstName!: string;

  @IsString()
  @Length(1, 120)
  lastName!: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'dateOfBirth must be a valid ISO-8601 date (YYYY-MM-DD)' })
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(LearnerGender)
  gender?: LearnerGender;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(120)
  grade?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(255)
  school?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(255)
  curriculum?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SUBJECTS)
  @IsString({ each: true })
  @MaxLength(MAX_SUBJECT_LENGTH, { each: true })
  subjects?: string[];

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(2000)
  goals?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(100)
  preferredLanguage?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateLearnerDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  lastName?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'dateOfBirth must be a valid ISO-8601 date (YYYY-MM-DD)' })
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(LearnerGender)
  gender?: LearnerGender;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(120)
  grade?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(255)
  school?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(255)
  curriculum?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SUBJECTS)
  @IsString({ each: true })
  @MaxLength(MAX_SUBJECT_LENGTH, { each: true })
  subjects?: string[];

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(2000)
  goals?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(100)
  preferredLanguage?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export { MAX_SUBJECTS, MAX_SUBJECT_LENGTH };

export class ListLearnersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  offset?: number;
}