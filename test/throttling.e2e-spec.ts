import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDatabase, disconnectDatabase } from './utils/clean-database';

/**
 * Suíte separada, de propósito: aqui o ThrottlerGuard real fica ativo (não
 * é sobrescrito, diferente de test/utils/create-test-app.ts), justamente
 * pra provar que o rate limiting de /auth/login funciona.
 */
describe('Throttling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('blocks login after 5 requests within the window', async () => {
    const credentials = {
      email: 'throttled@exemplo.com',
      password: 'senha-errada',
    };

    // As 5 primeiras contam pro limite, mesmo dando 401 (senha errada).
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(429);
  });
});
