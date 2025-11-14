import 'dotenv/config';

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// Replicate API 토큰 (테스트용 더미 값)
// 실제 API 호출은 하지 않지만, 에러를 방지하기 위해 설정
process.env.REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || 'test-replicate-token';

