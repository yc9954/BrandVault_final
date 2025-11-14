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

### 쿠키 도메인 설정 (선택적, 대부분 불필요)
```
# COOKIE_DOMAIN은 설정하지 마세요!
```
- **현재 배포 환경 (Render 서버 + Vercel 프론트)에서는 설정하지 않아야 합니다**
- 크로스 도메인 환경에서는 각 도메인이 자체 쿠키를 설정하므로 `domain` 옵션을 사용하지 않습니다
- **언제 설정하는가?**
  - 같은 루트 도메인의 서브도메인 간 공유가 필요한 경우만 (예: `api.example.com` ↔ `app.example.com` → `.example.com`)
  - 현재 Render + Vercel 환경: **설정하지 않음**
- 로컬 개발 환경: 설정하지 않으면 `localhost`에서 자동 작동

## 선택적 환경 변수

### Google OAuth (로그인 기능)
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-server.onrender.com/api/auth/google/callback
```
- Google OAuth 인증에 필요한 정보
- **Google OAuth는 완전 무료입니다** (사용량 제한 없음)
- Google Cloud Console (https://console.cloud.google.com)에서 발급

**설정 단계:**

#### 1단계: 프로젝트 생성/선택
1. https://console.cloud.google.com 접속
2. 상단에서 프로젝트 선택 또는 "새 프로젝트" 생성

#### 2단계: OAuth 동의 화면 구성 (필수!)
**⚠️ 중요: API Library에서 찾을 필요 없습니다! OAuth는 별도 API 활성화가 필요 없습니다.**

1. 왼쪽 메뉴에서 **APIs & Services** 클릭
2. **OAuth consent screen** 클릭 (API Library가 아님!)
3. "시작하기" 또는 "구성" 버튼 클릭
4. User Type 선택:
   - **✅ External 선택** (외부 - 일반 사용자용)
     - "Google 계정이 있는 모든 테스트 사용자가 사용할 수 있습니다" 옵션
     - 테스트 모드로 시작되며, 테스트 사용자 목록에 추가된 사용자만 사용 가능
     - 프로덕션 배포 시 Google 인증 제출 필요할 수 있음
     - **BrandVault는 일반 사용자용이므로 이걸 선택하세요!**
   - Internal (내부 - Google Workspace 조직 내부용)
     - 조직 내 사용자만 사용 가능
     - 인증 제출 불필요하지만, Google Workspace 조직이 필요함
5. 앱 정보 입력:
   - **App name**: BrandVault (또는 원하는 이름)
   - **User support email**: 본인 이메일 선택
   - **Developer contact information**: 본인 이메일 입력
6. **Scopes** (선택사항):
   - 기본 스코프만 사용하면 "Add or Remove Scopes" 건너뛰기
   - 또는 "Add or Remove Scopes" 클릭 후 `email`, `profile` 확인 (이미 포함되어 있을 수 있음)
7. **Test users** (External 선택 시):
   - 테스트 단계에서는 테스트 사용자 추가 필요
   - **+ ADD USERS** 클릭
   - 본인 Google 계정 이메일 추가
8. **Save and Continue** 클릭하여 완료

#### 3단계: OAuth 2.0 클라이언트 ID 생성
1. 왼쪽 메뉴: **APIs & Services** > **Credentials** 클릭
2. 상단 **+ CREATE CREDENTIALS** 버튼 클릭
3. 드롭다운에서 **OAuth 2.0 Client ID** 선택
4. Application type: **Web application** 선택
5. **Name**: BrandVault OAuth (또는 원하는 이름)

6. **승인된 JavaScript 원본** (선택사항, 하지만 권장):
   - 브라우저에서 요청을 시작하는 프론트엔드 URL
   - 개발 환경: `http://localhost:3001` (또는 프론트엔드 포트)
   - 프로덕션 환경: `https://brand-vault.vercel.app` (Vercel 배포 URL)
   - **+ URI 추가** 클릭하여 각각 추가

7. **승인된 리디렉션 URI** (필수!):
   - 백엔드 서버의 콜백 URL (웹 서버 요청)
   - 개발 환경: `http://localhost:3000/api/auth/google/callback`
   - 프로덕션 환경: `https://brandvault.onrender.com/api/auth/google/callback`
   - **+ URI 추가** 클릭하여 각각 추가
   - ⚠️ **이것은 반드시 설정해야 합니다!**

8. **CREATE** 클릭
9. 팝업 창에서 **Client ID**와 **Client Secret** 복사
   - ⚠️ **Client Secret은 한 번만 표시되므로 반드시 안전하게 보관하세요!**

**참고:**
- 설정이 적용되는 데 5분에서 몇 시간이 걸릴 수 있습니다 (보통 몇 분 내 적용됨)
- 개발 중에는 두 환경 모두 추가하는 것을 권장합니다

#### 4단계: 환경 변수 설정
Render 서버 환경 변수에 다음 추가:
```
GOOGLE_CLIENT_ID=복사한_Client_ID
GOOGLE_CLIENT_SECRET=복사한_Client_Secret
GOOGLE_CALLBACK_URL=https://your-server.onrender.com/api/auth/google/callback
```

**참고:**
- OAuth 동의 화면을 먼저 구성해야 클라이언트 ID를 생성할 수 있습니다
- External 타입은 처음에 "Testing" 상태로 시작하며, 최대 100명의 테스트 사용자만 사용 가능
- 프로덕션 배포 시 Google 검토를 통해 승인받으면 무제한 사용자 사용 가능

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

