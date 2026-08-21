import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'pessoa@exemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha12345', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
