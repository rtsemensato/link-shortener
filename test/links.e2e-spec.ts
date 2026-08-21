import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { registerAndLogin } from './utils/auth-helpers';
import {
  cleanDatabase,
  cleanLinksAndClicks,
  disconnectDatabase,
} from './utils/clean-database';
import { createTestApp } from './utils/create-test-app';

describe('Links (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  // Autentica uma única vez pra toda a suíte (não em beforeEach): repetir
  // register+login a cada teste estourava o rate limit real de
  // /auth/login (5/min) só dentro deste arquivo.
  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase();
    token = await registerAndLogin(app, 'owner@exemplo.com');
    otherToken = await registerAndLogin(app, 'other@exemplo.com');
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await cleanLinksAndClicks();
  });

  it('rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/links').expect(401);
  });

  it('creates a link with an auto-generated slug', async () => {
    const response = await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://exemplo.com/pagina-longa' })
      .expect(201);

    expect(response.body.slug).toHaveLength(7);
    expect(response.body.shortUrl).toContain(response.body.slug);
    expect(response.body.clickCount).toBe(0);
  });

  it('creates a link with a custom slug', async () => {
    const response = await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://exemplo.com', customSlug: 'meu-link' })
      .expect(201);

    expect(response.body.slug).toBe('meu-link');
  });

  it('rejects a duplicate custom slug', async () => {
    await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://exemplo.com/1', customSlug: 'duplicado' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://exemplo.com/2', customSlug: 'duplicado' })
      .expect(409);
  });

  it('rejects a slug that collides with a reserved API route', async () => {
    await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://exemplo.com', customSlug: 'health' })
      .expect(400);
  });

  it('rejects an invalid URL', async () => {
    await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'not-a-url' })
      .expect(400);
  });

  it('lists only the links owned by the authenticated user', async () => {
    await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://exemplo.com/a' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ originalUrl: 'https://exemplo.com/b' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/links')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].originalUrl).toBe('https://exemplo.com/a');
  });

  it("does not let a user delete another user's link", async () => {
    const created = await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://exemplo.com/a' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/links/${created.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('deletes an owned link', async () => {
    const created = await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://exemplo.com/a' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/links/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const list = await request(app.getHttpServer())
      .get('/links')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(list.body).toHaveLength(0);
  });
});
