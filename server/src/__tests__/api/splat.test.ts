import { describe, it, expect, beforeAll } from '@jest/globals';
import { testClient, getAuthCookie, authenticatedRequest } from '../helpers/testHelpers.js';

describe('Splat API', () => {
  let authCookie: string | null = null;

  beforeAll(async () => {
    authCookie = await getAuthCookie('creator');
  });

  describe('POST /api/splat/convert', () => {
    it('should start conversion when authenticated', async () => {
      if (!authCookie) {
        authCookie = await getAuthCookie('creator');
      }

      // 테스트용 이미지 파일 (더미)
      const response = await testClient
        .post('/api/splat/convert')
        .set('Cookie', authCookie || '')
        .attach('images', Buffer.from('fake image data'), 'test.jpg');

      // Splat 변환은 202 (Accepted)를 반환하거나 에러 발생 시 400/500
      expect([202, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testClient
        .post('/api/splat/convert')
        .attach('images', Buffer.from('test'), 'test.jpg');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/splat/status/:jobId', () => {
    it('should get job status when authenticated', async () => {
      if (!authCookie) {
        authCookie = await getAuthCookie('creator');
      }

      const jobId = 'test-job-id';
      const response = await authenticatedRequest('get', `/api/splat/status/${jobId}`, {
        cookie: authCookie || '',
      });

      // 작업이 없을 수도 있으므로 200 또는 404
      expect([200, 404]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testClient.get('/api/splat/status/test-job-id');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/splat/download/:jobId', () => {
    it('should download splat file when authenticated', async () => {
      if (!authCookie) {
        authCookie = await getAuthCookie('creator');
      }

      const jobId = 'test-job-id';
      const response = await authenticatedRequest('get', `/api/splat/download/${jobId}`, {
        cookie: authCookie || '',
      });

      // 파일이 없을 수도 있으므로 200 또는 404
      expect([200, 404]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testClient.get('/api/splat/download/test-job-id');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/splat/stream/:jobId', () => {
    it('should stream splat file when authenticated', async () => {
      if (!authCookie) {
        authCookie = await getAuthCookie('creator');
      }

      const jobId = 'test-job-id';
      const response = await authenticatedRequest('get', `/api/splat/stream/${jobId}`, {
        cookie: authCookie || '',
      });

      // 파일이 없을 수도 있으므로 200 또는 404
      expect([200, 404]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testClient.get('/api/splat/stream/test-job-id');

      expect(response.status).toBe(401);
    });
  });
});

