# Vercel 환경 변수 설정 가이드

Vercel 프로젝트 `brandvault3d`에 설정해야 할 환경 변수 목록입니다.

## 필수 환경 변수

Vercel 대시보드 > Settings > Environment Variables에서 다음 변수들을 설정하세요:

### 데이터베이스
```
DATABASE_URL=your_database_connection_string
```
- Prisma에서 사용하는 데이터베이스 연결 URL
- 예: `postgresql://user:password@host:port/database?schema=public`

### 인증
```
JWT_SECRET=your_jwt_secret_key
```
- JWT 토큰 서명에 사용할 시크릿 키
- 강력한 랜덤 문자열을 사용하세요

### 클라이언트 설정
```
REACT_APP_API_URL=https://brandvault3d.vercel.app
```
- 클라이언트에서 API 호출에 사용할 URL
- 배포 후 생성된 Vercel 도메인으로 설정
- 예: `https://brandvault3d.vercel.app`

### CORS 설정 (선택적)
```
CLIENT_URL=https://brandvault3d.vercel.app
```
- CORS 허용할 클라이언트 URL
- 보통 `REACT_APP_API_URL`과 동일

## 선택적 환경 변수

### Replicate API (Splat 변환 기능)
```
REPLICATE_API_TOKEN=your_replicate_token
```
- Replicate API 토큰 (Splat 변환 기능 사용 시 필요)
- https://replicate.com 에서 발급

## 환경 변수 설정 방법

1. Vercel 대시보드 접속: https://vercel.com/yc9954s-projects/brandvault3d
2. Settings > Environment Variables 이동
3. 각 변수를 추가:
   - Key: 변수 이름 (예: `DATABASE_URL`)
   - Value: 변수 값 (예: `postgresql://...`)
   - Environment: `Production`, `Preview`, `Development` 중 선택 (보통 `Production` 선택)
4. "Save" 클릭

## 환경별 설정

- **Production**: 프로덕션 배포에 사용
- **Preview**: Preview 배포에 사용 (Git 브랜치 푸시 시)
- **Development**: 로컬 개발 시 `vercel dev` 명령어 사용 시

대부분의 경우 Production과 Preview에 동일한 값을 설정하세요.

## 주의사항

- 환경 변수를 설정한 후에는 **반드시 다시 배포**해야 합니다
- `.env` 파일은 Git에 커밋하지 마세요 (이미 `.gitignore`에 포함됨)
- 민감한 정보는 절대 코드에 하드코딩하지 마세요

