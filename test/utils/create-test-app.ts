import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

/**
 * Cria a app Nest com os mesmos pipes globais de main.ts, pros e2e testarem
 * o comportamento real. O guard de rate limiting é desligado aqui: os e2e
 * rodam dezenas de requisições em sequência rápida (register+login em
 * quase todo teste), o que estoura o limite de produção (5 login/min) e
 * derruba testes que não têm nada a ver com throttling.
 *
 * `overrideGuard(ThrottlerGuard)` NÃO funciona aqui: o guard é registrado
 * globalmente via `{ provide: APP_GUARD, useClass: ThrottlerGuard }` em
 * AppModule, e `overrideGuard` não intercepta esse token corretamente
 * nessa versão do Nest/throttler (o guard real continuava rodando mesmo
 * "sobrescrito", como comprovado rodando a suíte com e sem esse fix). A
 * forma que funciona de verdade é sobrescrever o provider `APP_GUARD`
 * direto. O comportamento real de throttling tem seu próprio teste
 * dedicado em `throttling.e2e-spec.ts`, que NÃO usa este helper.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(APP_GUARD)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}
