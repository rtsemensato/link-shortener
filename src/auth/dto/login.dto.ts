import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'pessoa@exemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha12345' })
  @IsString()
  password: string;
}
