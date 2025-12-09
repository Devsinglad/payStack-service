import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    description: 'permissions of the API key',
  })
  @IsArray()
  permissions: string[];

  @ApiProperty({
    example: '1D',
    description: 'Expiration date for the API key (optional)',
  })
  @IsString()
  @IsOptional()
  expiresAt?: string;
}
