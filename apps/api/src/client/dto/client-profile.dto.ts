import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';

const toNullableString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const toPhoneOrNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const MAX_IMAGE_DATA_URI_LENGTH = 5_400_000; // ~4MB of image data as base64

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

@ValidatorConstraint({ name: 'isPhotoUrl', async: false })
class IsPhotoUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || value.length === 0) return false;
    if (value.startsWith('data:image/')) {
      if (value.length > MAX_IMAGE_DATA_URI_LENGTH) return false;
      const comma = value.indexOf(',');
      if (comma === -1) return false;
      const header = value.slice(0, comma);
      const mime = header.slice(5, header.indexOf(';') === -1 ? header.length : header.indexOf(';'));
      return ALLOWED_IMAGE_MIME_TYPES.has(mime) && comma + 1 < value.length;
    }
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'photoUrl must be an image data URI or an http(s) URL';
  }
}

export class UpdateClientProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  lastName?: string;

  @IsOptional()
  @Transform(toNullableString)
  @Validate(IsPhotoUrlConstraint)
  photoUrl?: string | null;

  @IsOptional()
  @Transform(toPhoneOrNull)
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Enter a valid phone in E.164 format (e.g. +380501234567)',
  })
  phone?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(100)
  preferredLanguage?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @Transform(toNullableString)
  @IsString()
  @MaxLength(2000)
  bio?: string | null;
}

export { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_DATA_URI_LENGTH };