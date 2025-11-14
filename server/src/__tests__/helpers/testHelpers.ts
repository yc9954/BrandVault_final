import request from 'supertest';
import app from '../../app.js';

/**
 * 테스트용 HTTP 클라이언트
 */
export const testClient = request(app);

/**
 * 인증된 요청을 위한 헬퍼
 * 로그인 후 쿠키를 반환
 */
export async function getAuthCookie(userType: 'creator' | 'brand' = 'creator') {
  const loginEndpoint = userType === 'creator' 
    ? '/api/auth/login/creator' 
    : '/api/auth/login/brand';
  
  const response = await testClient
    .post(loginEndpoint)
    .send({});
  
  // Set-Cookie 헤더에서 쿠키 추출
  const cookies = response.headers['set-cookie'];
  if (cookies && Array.isArray(cookies) && cookies.length > 0) {
    return cookies[0].split(';')[0]; // 'jwt=token' 형태만 반환
  }
  return null;
}

/**
 * 인증된 요청 헬퍼
 */
export async function authenticatedRequest(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  endpoint: string,
  options: {
    cookie?: string;
    body?: any;
    query?: any;
  } = {}
) {
  let req = testClient[method](endpoint);
  
  if (options.cookie) {
    req = req.set('Cookie', options.cookie);
  }
  
  if (options.body) {
    req = req.send(options.body);
  }
  
  if (options.query) {
    req = req.query(options.query);
  }
  
  return req;
}

