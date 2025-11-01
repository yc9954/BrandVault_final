# Vercel 배포 가이드

이 프로젝트를 Vercel에 배포하는 방법입니다.

## 사전 준비

1. [Vercel](https://vercel.com) 계정 생성
2. GitHub 저장소와 Vercel 연동

## 배포 방법

### 1. GitHub를 통한 자동 배포 (추천)

1. Vercel 대시보드에서 "New Project" 클릭
2. GitHub 저장소 `yc9954/brandvault` 선택
3. 프로젝트 설정:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `cd client && npm install && npm run build`
   - **Output Directory**: `client/build`
   - **Install Command**: `cd client && npm install && cd ../server && npm install`

4. 환경 변수 설정 (Environment Variables):
   ```
   # Database
   DATABASE_URL=your_database_url
   
   # JWT
   JWT_SECRET=your_jwt_secret
   
   # Client URL (Vercel 자동 설정됨)
   CLIENT_URL=https://your-project.vercel.app
   
   # API URL (Client에서 사용)
   REACT_APP_API_URL=https://your-project.vercel.app
   
   # Replicate (Splat 변환용)
   REPLICATE_API_TOKEN=your_replicate_token
   ```

5. "Deploy" 클릭

### 2. Vercel CLI를 통한 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 루트에서 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

## 프로젝트 구조

- `client/`: React 프론트엔드 (정적 빌드)
- `server/`: Express 백엔드 (Serverless Functions)
- `api/`: Vercel Serverless Functions 래퍼

## 환경 변수

Vercel 대시보드에서 다음 환경 변수를 설정해야 합니다:

### 필수 환경 변수
- `DATABASE_URL`: Prisma 데이터베이스 연결 URL
- `JWT_SECRET`: JWT 토큰 서명용 시크릿 키
- `REACT_APP_API_URL`: 클라이언트에서 사용할 API URL (보통 Vercel 도메인)

### 선택적 환경 변수
- `CLIENT_URL`: CORS 허용할 클라이언트 URL
- `REPLICATE_API_TOKEN`: Replicate API 토큰 (Splat 변환 기능용)

## 주의사항

1. **데이터베이스**: Vercel은 Serverless Functions이므로 데이터베이스 연결 풀링을 고려해야 합니다. Prisma는 이를 자동으로 처리합니다.

2. **파일 업로드**: Vercel Serverless Functions는 파일 시스템에 영구 저장할 수 없습니다. 파일은 외부 스토리지(AWS S3, Cloudinary 등)를 사용해야 합니다.

3. **환경 변수**: `.env` 파일은 Git에 커밋하지 않으므로 Vercel 대시보드에서 직접 설정해야 합니다.

4. **빌드 시간**: Serverless Functions는 콜드 스타트가 있을 수 있습니다. 프로덕션 환경에서는 적절한 타임아웃을 설정하세요.

## 문제 해결

### 빌드 실패
- `package.json`에서 모든 의존성이 올바른지 확인
- Node.js 버전이 맞는지 확인 (Vercel 대시보드에서 설정 가능)

### API 요청 실패
- CORS 설정 확인
- 환경 변수 `REACT_APP_API_URL`이 올바르게 설정되었는지 확인
- Vercel Functions 로그 확인 (Vercel 대시보드 > Functions)

### 데이터베이스 연결 오류
- `DATABASE_URL`이 올바른지 확인
- Prisma 마이그레이션 실행 (`prisma migrate deploy`)

