# API 테스트 가이드

이 디렉토리에는 BrandVault 백엔드 API에 대한 테스트 파일들이 포함되어 있습니다.

## 테스트 실행

```bash
# 모든 테스트 실행
npm test

# Watch 모드로 실행 (파일 변경 시 자동 재실행)
npm run test:watch

# 커버리지 리포트 생성
npm run test:coverage
```

## 테스트 구조

```
__tests__/
├── setup.ts              # 테스트 환경 설정
├── helpers/
│   └── testHelpers.ts    # 테스트 유틸리티 함수
└── api/
    ├── auth.test.ts      # 인증 API 테스트
    ├── products.test.ts  # 제품 API 테스트
    ├── projects.test.ts  # 프로젝트 API 테스트
    ├── brands.test.ts    # 브랜드 API 테스트
    ├── files.test.ts     # 파일 API 테스트
    └── splat.test.ts     # Splat API 테스트
```

## 테스트 헬퍼 함수

### `testClient`
Supertest를 사용한 HTTP 클라이언트

```typescript
import { testClient } from '../helpers/testHelpers';

const response = await testClient.get('/api/products');
```

### `getAuthCookie(userType)`
인증 쿠키를 가져오는 헬퍼 함수

```typescript
import { getAuthCookie } from '../helpers/testHelpers';

const cookie = await getAuthCookie('creator'); // 또는 'brand'
```

### `authenticatedRequest(method, endpoint, options)`
인증이 필요한 요청을 보내는 헬퍼 함수

```typescript
import { authenticatedRequest } from '../helpers/testHelpers';

const response = await authenticatedRequest('get', '/api/products/user', {
  cookie: cookie,
});
```

## 테스트 작성 가이드

1. **각 API 엔드포인트별로 테스트 작성**
   - 성공 케이스
   - 실패 케이스 (인증 실패, 잘못된 파라미터 등)

2. **인증이 필요한 API는 `getAuthCookie()` 사용**
   ```typescript
   const cookie = await getAuthCookie('creator');
   const response = await testClient
     .get('/api/projects')
     .set('Cookie', cookie);
   ```

3. **에러 케이스도 테스트**
   - 401 (인증 실패)
   - 404 (리소스 없음)
   - 400 (잘못된 요청)

## 환경 변수

테스트 실행 시 다음 환경 변수가 설정됩니다:
- `NODE_ENV=test`
- `JWT_SECRET` (기본값: 'test-secret-key')
- `DATABASE_URL` 또는 `TEST_DATABASE_URL`

## 주의사항

- 테스트는 실제 데이터베이스를 사용하지 않도록 주의하세요
- 가능하면 테스트용 데이터베이스를 사용하거나 모킹을 고려하세요
- 파일 업로드 테스트는 실제 파일이 아닌 더미 데이터를 사용합니다

