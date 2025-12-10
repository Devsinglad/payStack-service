import {
  IsString,
  IsNumber,
  IsPositive,
  Length,
  IsEmail,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({
    example: '1234567890',
    description: 'Recipient wallet number (10-20 digits)',
  })
  @IsString()
  @Length(10, 20)
  wallet_number: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address (optional, for notification purposes)',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 2500,
    description: 'Transfer amount in Naira',
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}
