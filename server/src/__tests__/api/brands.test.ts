import { describe, it, expect } from '@jest/globals';
import { testClient } from '../helpers/testHelpers.js';

describe('Brands API', () => {
  describe('GET /api/brands/featured', () => {
    it('should get featured brand list', async () => {
      const response = await testClient.get('/api/brands/featured');

      expect(response.status).toBe(200);
      // 응답 형식: { data: [...], meta: {...} }
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
    });
  });
});

