import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsEmail, IsOptional } from 'class-validator';

export class DepositDto {
  @ApiProperty({
    example: 'user@example.com',
    description:
      'Email address for the deposit (optional, will use user email if not provided)',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 5000,
    description: 'Deposit amount in Naira',
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}
