import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { registerAndLogin } from './utils/auth-helpers';
import {
  cleanDatabase,
  cleanLinksAndClicks,
  disconnectDatabase,
} from './utils/clean-database';
import { createTestApp } from './utils/create-test-app';

describe('Redirect (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase();
    token = await registerAndLogin(app, 'owner@exemplo.com');
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await cleanLinksAndClicks();
  });

  it('redirects to the original URL and tracks the click', async () => {
    const created = await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({
        originalUrl: 'https://exemplo.com/pagina-longa',
        customSlug: 'atalho',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/atalho')
      .expect(302);
    expect(response.headers.location).toBe('https://exemplo.com/pagina-longa');

    const stats = await request(app.getHttpServer())
      .get(`/links/${created.body.id}/stats`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(stats.body.totalClicks).toBe(1);
    expect(stats.body.clicksByDay).toHaveLength(1);
  });

  it('accumulates multiple clicks', async () => {
    const created = await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://exemplo.com', customSlug: 'popular' })
      .expect(201);

    await request(app.getHttpServer()).get('/popular').expect(302);
    await request(app.getHttpServer()).get('/popular').expect(302);
    await request(app.getHttpServer()).get('/popular').expect(302);

    const stats = await request(app.getHttpServer())
      .get(`/links/${created.body.id}/stats`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(stats.body.totalClicks).toBe(3);
  });

  it('returns 404 for an unknown slug', async () => {
    await request(app.getHttpServer()).get('/esse-slug-nao-existe').expect(404);
  });

  it('does not shadow reserved API routes with the catch-all redirect', async () => {
    // /health precisa continuar respondendo o health check, não cair no
    // catch-all `:slug` do RedirectController. Ver CLAUDE.md.
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
