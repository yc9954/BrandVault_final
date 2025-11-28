import { describe, it, expect } from '@jest/globals';
import { testClient, getAuthCookie, authenticatedRequest } from '../helpers/testHelpers.js';

describe('Projects API', () => {
  describe('GET /api/projects', () => {
    it('should get user projects when authenticated', async () => {
      const cookie = await getAuthCookie('creator');
      const response = await authenticatedRequest('get', '/api/projects', {
        cookie: cookie || '',
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testClient.get('/api/projects');

      expect(response.status).toBe(401);
    });
  });
});

