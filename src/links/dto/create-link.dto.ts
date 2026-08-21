import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateLinkDto {
  @ApiProperty({ example: 'https://exemplo.com/pagina-com-url-gigante' })
  @IsUrl({ require_protocol: true })
  originalUrl: string;

  @ApiPropertyOptional({
    example: 'meu-link',
    description: 'Slug customizado (opcional); sorteado se omitido.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'customSlug só pode conter letras, números, hífen e underscore',
  })
  customSlug?: string;
}
