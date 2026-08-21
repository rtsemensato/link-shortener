import { Module } from '@nestjs/common';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { RedirectController } from './redirect.controller';

@Module({
  // Ordem importa: RedirectController (`:slug`) precisa vir depois de
  // LinksController (`/links/*`), ver comentário em redirect.controller.ts.
  controllers: [LinksController, RedirectController],
  providers: [LinksService],
})
export class LinksModule {}
