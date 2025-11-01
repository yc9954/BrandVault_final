# Vercel 배포 문제 해결 가이드

## NOT_FOUND (404) 에러 해결

### 1. 클라이언트 사이드 라우팅 문제

React 앱에서 클라이언트 사이드 라우팅을 사용할 때, 직접 URL로 접근하면 404 에러가 발생할 수 있습니다.

**해결 방법:**
`vercel.json`에 rewrite 규칙이 올바르게 설정되어 있는지 확인:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. API 라우팅 문제

API 엔드포인트가 404를 반환하는 경우:

1. **헬스 체크 확인:**
   ```
   https://your-domain.vercel.app/api/health
   ```
   이 엔드포인트가 작동하면 API 함수 자체는 정상입니다.

2. **라우팅 경로 확인:**
   - 클라이언트에서 호출하는 API URL 확인
   - `REACT_APP_API_URL` 환경 변수가 올바르게 설정되었는지 확인
   - Vercel Functions 로그 확인 (Vercel 대시보드 > Functions)

3. **Express 라우팅 확인:**
   - `api/index.ts`에서 라우트가 올바르게 설정되었는지 확인
   - 원래 서버의 라우트와 동일한 경로 구조인지 확인

### 3. 빌드 실패

**증상:**
- 배포가 빌드 단계에서 실패
- Vercel 대시보드에서 빌드 로그 확인 필요

**해결 방법:**
1. 빌드 로그 확인:
   - Vercel 대시보드 > Deployments > 실패한 배포 > Build Logs

2. 일반적인 원인:
   - TypeScript 컴파일 오류
   - 의존성 설치 실패
   - 환경 변수 누락

3. 로컬에서 빌드 테스트:
   ```bash
   cd client
   npm install
   npm run build
   ```

### 4. 환경 변수 문제

**증상:**
- 애플리케이션이 실행되지만 기능이 작동하지 않음
- 데이터베이스 연결 오류
- API 인증 실패

**해결 방법:**
1. Vercel 대시보드에서 환경 변수 확인:
   - Settings > Environment Variables
   - Production, Preview, Development 환경별로 설정 필요

2. 필수 환경 변수:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `REACT_APP_API_URL`

3. 환경 변수 설정 후 재배포 필요

### 5. CORS 문제

**증상:**
- 브라우저 콘솔에 CORS 에러
- API 요청이 차단됨

**해결 방법:**
1. `api/index.ts`에서 CORS 설정 확인
2. `CLIENT_URL` 환경 변수 설정
3. Vercel URL이 올바르게 포함되었는지 확인

### 6. 정적 파일 서빙 문제

Vercel Serverless Functions에서는 파일 시스템에 영구 저장이 불가능합니다.

**문제:**
- 업로드된 파일이 사라짐
- 정적 파일 접근 불가

**해결 방법:**
- 외부 스토리지 사용 (AWS S3, Cloudinary 등)
- 또는 Vercel Blob Storage 사용

### 7. 함수 타임아웃

**증상:**
- API 요청이 타임아웃
- 504 에러 발생

**해결 방법:**
1. Vercel의 기본 타임아웃은 10초 (Pro 플랜: 최대 60초)
2. 오래 걸리는 작업은 백그라운드 작업으로 분리
3. Vercel의 타임아웃 제한 확인 및 조정

### 8. 로그 확인 방법

**Vercel 대시보드:**
1. Deployments 탭에서 배포 선택
2. Functions 탭에서 serverless function 로그 확인
3. Runtime Logs에서 실시간 로그 확인

**로컬 디버깅:**
```bash
npm i -g vercel
vercel dev
```

### 9. 일반적인 체크리스트

- [ ] `vercel.json`이 루트 디렉토리에 있음
- [ ] `api/index.ts`가 올바르게 설정됨
- [ ] 모든 의존성이 `package.json`에 포함됨
- [ ] 환경 변수가 Vercel에 설정됨
- [ ] 빌드 명령어가 올바름
- [ ] 출력 디렉토리가 올바름
- [ ] Git 저장소가 올바르게 연결됨

### 10. 유용한 디버깅 도구

**헬스 체크:**
```
GET /api/health
```

**Vercel Functions 로그:**
- Vercel 대시보드 > Functions > 해당 함수 > Logs

**네트워크 탭:**
- 브라우저 개발자 도구에서 API 요청 확인
- 요청 URL, 헤더, 응답 확인

## 추가 리소스

- [Vercel 문서 - 에러 코드](https://vercel.com/docs/errors)
- [Vercel 문서 - Express](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Vercel 커뮤니티](https://community.vercel.com/)

