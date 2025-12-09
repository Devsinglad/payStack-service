import {
  IsArray,
  IsNotEmpty,
  IsString,
  ArrayNotEmpty,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Define valid permissions
export const VALID_PERMISSIONS = [
  'deposit',
  'transfer',
  'read',
  'write',
  'delete',
  'admin',
];

export class CreateApiKeyDto {
  @ApiProperty({
    example: 'My Service API Key',
    description: 'Name of the API key',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: ['deposit', 'transfer', 'read'],
    description: 'Permissions of the API key',
    enum: VALID_PERMISSIONS,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissions: string[];

  @ApiProperty({
    example: '1D',
    description: 'Expiration period for the API key (1H, 1D, 1M, 1Y)',
  })
  @IsString()
  @IsNotEmpty()
  expiry: string;
}
