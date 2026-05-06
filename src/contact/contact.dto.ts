import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'Sarah Connor', description: 'Full name of the sender' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'sarah@skynet.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Skynet GmbH' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @ApiPropertyOptional({ example: 'Senior Frontend role at Skynet' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ example: 'Hi Dipanshu, I came across your portfolio...' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}
