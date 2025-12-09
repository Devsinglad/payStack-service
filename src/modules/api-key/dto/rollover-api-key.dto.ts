import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RolloverApiKeyDto {
  @ApiProperty({
    example: 'FGH2485K6KK79GKG9GKGK',
    description: 'ID of the expired API key',
  })
  @IsString()
  @IsNotEmpty()
  expired_key_id: string;

  @ApiProperty({
    example: '1M',
    description: 'New expiration period for the API key',
  })
  @IsString()
  @IsNotEmpty()
  expiry: string;
}
