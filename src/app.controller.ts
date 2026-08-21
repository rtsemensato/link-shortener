import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiExcludeController()
@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  /**
   * API pura, sem frontend: quem visita a raiz (ex: clicando em "ver ao
   * vivo" no portfólio) via de outra forma cairia num 404 cru. Manda pra
   * documentação interativa, que é o que faz sentido pra ver a API rodando.
   */
  @Get()
  root(@Res() res: Response): void {
    res.redirect(HttpStatus.FOUND, '/api/docs');
  }
}
