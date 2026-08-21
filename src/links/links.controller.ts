import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLinkDto } from './dto/create-link.dto';
import { LinksService } from './links.service';

interface LinkRecord {
  id: string;
  slug: string;
  originalUrl: string;
  clickCount: number;
  createdAt: Date;
}

@ApiTags('links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('links')
export class LinksController {
  constructor(
    private readonly linksService: LinksService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLinkDto,
  ) {
    const link = await this.linksService.create(user.userId, dto);
    return this.withShortUrl(link);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const links = await this.linksService.findAllByOwner(user.userId);
    return links.map((link) => this.withShortUrl(link));
  }

  @Get(':id/stats')
  stats(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.linksService.stats(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.linksService.remove(user.userId, id);
  }

  private withShortUrl(link: LinkRecord) {
    const baseUrl = this.config.get<string>(
      'BASE_URL',
      'http://localhost:3000',
    );
    return { ...link, shortUrl: `${baseUrl}/${link.slug}` };
  }
}
