import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Auth Routes', () => {
  it('POST /api/auth/register with missing fields returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' });
    expect([400, 422]).toContain(res.status);
  });

  it('rejects disposable email domains before creating an account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'disposable-test-user',
        email: 'person@mailinator.com',
        password: 'a-strong-test-password',
        displayName: 'Disposable Test User',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please use a permanent email address to register.');
  });

  it('POST /api/auth/login with wrong credentials returns 401 or 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notreal@test.com', password: 'wrongpassword' });
    expect([400, 401]).toContain(res.status);
  });

  it('protected route without token returns 401', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/analytics/portfolio-views without token returns 401', async () => {
    const res = await request(app).get('/api/analytics/portfolio-views');
    expect([401, 403]).toContain(res.status);
  });
});
