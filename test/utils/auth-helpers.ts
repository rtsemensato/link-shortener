import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function registerAndLogin(
  app: INestApplication,
  email: string,
  password = 'senha12345',
): Promise<string> {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password })
    .expect(201);

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return login.body.accessToken as string;
}
