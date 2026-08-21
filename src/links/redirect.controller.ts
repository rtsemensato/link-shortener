import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { LinksService } from './links.service';

/**
 * Controller separado (sem JwtAuthGuard) pro redirect público em `/:slug`.
 * Precisa ser registrado DEPOIS dos controllers com rotas literais
 * (AppController `/health`, AuthController `/auth/*`, LinksController
 * `/links/*`) pra essas rotas terem prioridade sobre o catch-all de um
 * segmento só. A ordem vem de `LinksModule.controllers` e da ordem de
 * `imports` em `AppModule`; ver CLAUDE.md.
 */
@ApiExcludeController()
@Controller()
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(':slug')
  async redirect(
    @Param('slug') slug: string,
    @Res() res: Response,
  ): Promise<void> {
    const originalUrl = await this.linksService.resolveAndRegisterClick(slug);
    res.redirect(HttpStatus.FOUND, originalUrl);
  }
}
