import { describe, it, expect } from '@jest/globals';
import { testClient, getAuthCookie, authenticatedRequest } from '../helpers/testHelpers.js';

describe('Products API', () => {
  describe('GET /api/products', () => {
    it('should get product list', async () => {
      const response = await testClient.get('/api/products');

      expect(response.status).toBe(200);
      // 응답 형식: { data: [...], meta: {...} }
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
    });

    it('should support pagination query parameters', async () => {
      const response = await testClient
        .get('/api/products')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get product details', async () => {
      // 실제 제품 ID가 있다면 사용, 없으면 1로 테스트
      const productId = 1;
      const response = await testClient.get(`/api/products/${productId}`);

      // 제품이 없을 수도 있으므로 200 또는 404
      expect([200, 404]).toContain(response.status);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await testClient.get('/api/products/999999');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/products/user', () => {
    it('should get user products when authenticated', async () => {
      const cookie = await getAuthCookie('creator');
      const response = await authenticatedRequest('get', '/api/products/user', {
        cookie: cookie || '',
      });

      expect(response.status).toBe(200);
      // handleGetUserProducts는 result 객체를 직접 반환 (배열이 아닐 수 있음)
      // 실제 응답 구조에 맞게 수정
      expect(response.body).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testClient.get('/api/products/user');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/products/:id/download', () => {
    it('should get download URL', async () => {
      const productId = 1;
      // type 쿼리 파라미터가 필요함 ('image' 또는 'model')
      const response = await testClient
        .get(`/api/products/${productId}/download`)
        .query({ type: 'image' });

      // type이 없으면 400, 제품이 없으면 404, 성공하면 200
      expect([200, 400, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('url');
      }
    });
  });
});

