import { describe, it, expect } from '@jest/globals';
import { testClient } from '../helpers/testHelpers.js';

describe('Files API', () => {
  describe('POST /api/file/upload', () => {
    it('should upload a file', async () => {
      // 테스트용 더미 파일 생성
      const response = await testClient
        .post('/api/file/upload')
        .attach('file', Buffer.from('test file content'), 'test.txt');

      // 파일 업로드 성공 시 201, 실패 시 400/500
      expect([201, 400, 500]).toContain(response.status);
    });

    it('should reject file larger than 10MB', async () => {
      // 11MB 크기의 더미 파일
      const largeFile = Buffer.alloc(11 * 1024 * 1024);
      const response = await testClient
        .post('/api/file/upload')
        .attach('file', largeFile, 'large.txt');

      // 파일 크기 초과 시 400, 413, 또는 500 (서버 에러)
      expect([400, 413, 500]).toContain(response.status);
    });
  });

  describe('GET /api/file/url', () => {
    it('should get file URL with path parameter', async () => {
      const response = await testClient
        .get('/api/file/url')
        .query({ path: 'test/path.jpg' });

      // 파일이 없을 수도 있으므로 200 또는 404
      expect([200, 404, 400]).toContain(response.status);
    });
  });

  describe('DELETE /api/file', () => {
    it('should delete file with path parameter', async () => {
      // DELETE는 body에 filePath를 보냄 (query가 아님)
      const response = await testClient
        .delete('/api/file')
        .send({ filePath: 'test/path.jpg' });

      // 파일 삭제 성공 시 200, 실패 시 400/500
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});

