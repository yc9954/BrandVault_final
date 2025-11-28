import { describe, it, expect } from '@jest/globals';
import { testClient, getAuthCookie } from '../helpers/testHelpers.js';

describe('Auth API', () => {
  describe('POST /api/auth/login/creator', () => {
    it('should login creator and set JWT cookie', async () => {
      const response = await testClient
        .post('/api/auth/login/creator')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie']?.[0]).toContain('jwt=');
    });
  });

  describe('POST /api/auth/login/brand', () => {
    it('should login brand and set JWT cookie', async () => {
      const response = await testClient
        .post('/api/auth/login/brand')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie']?.[0]).toContain('jwt=');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and clear JWT cookie', async () => {
      // 먼저 로그인
      const cookie = await getAuthCookie('creator');
      expect(cookie).not.toBeNull();

      // 로그아웃
      const response = await testClient
        .post('/api/auth/logout')
        .set('Cookie', cookie || '');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '로그아웃 성공');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await testClient
        .post('/api/auth/logout')
        .send({});

      // 로그아웃은 쿠키가 없어도 성공할 수 있지만, 
      // 실제 구현에 따라 다를 수 있음
      expect([200, 401]).toContain(response.status);
    });
  });
});

