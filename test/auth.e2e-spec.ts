import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, disconnectDatabase } from './utils/clean-database';
import { createTestApp } from './utils/create-test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  const credentials = { email: 'pessoa@exemplo.com', password: 'senha12345' };

  it('registers a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    expect(response.body).toMatchObject({ email: credentials.email });
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('rejects registering the same e-mail twice', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(409);
  });

  it('rejects a password shorter than 8 characters', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'outra@exemplo.com', password: '123' })
      .expect(400);
  });

  it('logs in and returns an access and a refresh token', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);

    expect(typeof response.body.accessToken).toBe('string');
    expect(typeof response.body.refreshToken).toBe('string');
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: 'senha-errada' })
      .expect(401);
  });

  it('rotates the refresh token and invalidates the previous one', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);
    const { refreshToken } = login.body;

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshed.body.refreshToken).not.toBe(refreshToken);

    // O token antigo já foi consumido, não deve mais funcionar.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('invalidates the refresh token on logout', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);
    const { refreshToken } = login.body;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken })
      .expect(204);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
