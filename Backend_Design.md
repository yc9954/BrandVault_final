# BrandVault - Backend Design 최종본

## 문서 정보
- **프로젝트명**: BrandVault
- **작성일**: 2025-11-29
- **문서 목적**: 최종 평가를 위한 Backend 설계 및 API 명세서

**변경 이력**:
- <span style="color: blue">**[추가]** 비디오 제품 삽입 기능 (AI 파이프라인)</span>
- <span style="color: blue">**[추가]** SSE 기반 실시간 작업 진행률 알림</span>
- <span style="color: blue">**[추가]** 프레임 리샘플링/복원 최적화</span>
- <span style="color: blue">**[변경]** Google OAuth 2.0 통합 인증</span>
- <span style="color: blue">**[변경]** GCS Signed URL 기반 파일 제공</span>

---
## 1. 프로젝트 개요

### 1.1 핵심 비즈니스 기능

BrandVault는 3D 제품 자산 관리 및 AI 기반 비디오 편집 플랫폼으로, 다음 핵심 기능을 Backend에서 제공합니다:

1. **3D 자산 변환** (Gaussian Splat)
   - 2D 이미지 → 3D 모델 변환 (Replicate Trellis AI)
   - GLB, PLY, Splat 형식 지원
   - 비동기 작업 처리

2. **AI 비디오 제품 삽입** <span style="color: blue">**[신규 핵심 기능]**</span>
   - 비디오 내 제품 자동 삽입 (SAM2 + Anydoor + AnyV2V)
   - 프레임 리샘플링 최적화 (16프레임)
   - 실시간 진행률 알림 (SSE)

3. **제품 마켓플레이스**
   - 커서 기반 무한 스크롤
   - 검색 및 필터링 (최신순, 인기순, 조회수순)
   - 제품 저장/다운로드

4. **다중 사용자 역할 관리**
   - Creator: 3D 제품 소비, 프로젝트 생성
   - Brand: 제품 업로드, 에셋 관리
   - Google OAuth 통합 인증 <span style="color: blue">**[추가]**</span>

---

## 2. Backend 아키텍처

### 2.1 기술 스택

| 계층 | 기술 | 버전 | 역할 |
|------|------|------|------|
| **Runtime** | Node.js | v22.21.1 | 서버 런타임 |
| **Framework** | Express | 5.1.0 | 웹 프레임워크 |
| **Language** | TypeScript | 5.9.3 | 정적 타입 언어 |
| **ORM** | Prisma | 6.18.0 | 데이터베이스 ORM |
| **Database** | PostgreSQL | - | 관계형 데이터베이스 |
| **Storage** | Google Cloud Storage | 7.17.2 | 파일 저장소 |
| **AI Platform** | Replicate | 1.3.1 | AI 모델 추론 |
| **Authentication** | JWT + Passport | 9.0.2 + 0.7.0 | 인증 시스템 |

### 2.2 디렉토리 구조

```
server/
├── src/
│   ├── routes/          # API 라우트 정의
│   ├── controllers/     # 요청 처리 로직
│   ├── services/        # 비즈니스 로직
│   ├── midwares/        # 미들웨어 (인증 등)
│   ├── config/          # 설정 (Passport, Swagger)
│   ├── types/           # TypeScript 타입
│   ├── utils/           # 유틸리티
│   ├── app.ts           # Express 앱 설정
│   └── index.ts         # 엔트리 포인트
├── prisma/
│   └── schema.prisma    # DB 스키마
└── package.json
```

---

## 3. API 엔드포인트 목록

### 3.1 전체 엔드포인트 요약

| 카테고리 | 엔드포인트 수 | 인증 필요 | 주요 기능 |
|---------|------------|----------|-----------|
| **인증 (Auth)** | 5 | 1/5 | 로그인, 로그아웃, Google OAuth |
| **제품 (Products)** | 9 | 4/9 | CRUD, 검색, 필터링, 다운로드 |
| **브랜드 (Brands)** | 4 | 1/4 | 브랜드 조회, 에셋 관리 |
| **프로필 (Profile)** | 3 | 3/3 | 사용자 정보 관리 |
| **3D Splat** | 4 | 4/4 | 이미지 → 3D 변환 |
| **프로젝트 (Projects)** | 4 | 4/4 | 프로젝트 CRUD |
| **비디오 삽입** <span style="color: blue">**[신규]**</span> | 4 | 0/4 | AI 비디오 편집 |
| **파일 (Files)** | 3 | 0/3 | 업로드, 다운로드, 삭제 |
| **총합** | **36** | **17/36** | - |

### 3.2 카테고리별 엔드포인트

#### 3.2.1 인증 (Authentication)
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/api/auth/login/creator` | X | Creator 로그인 |
| POST | `/api/auth/login/brand` | X | Brand 로그인 |
| POST | `/api/auth/logout` | O | 로그아웃 |
| GET | `/api/auth/google` | X | Google OAuth 시작 <span style="color: blue">**[추가]**</span> |
| GET | `/api/auth/google/callback` | X | Google OAuth 콜백 <span style="color: blue">**[추가]**</span> |

#### 3.2.2 제품 (Products)
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/api/products` | X | 제품 목록 (커서 페이지네이션) |
| GET | `/api/products/search` | X | 제품 검색 |
| GET | `/api/products/:id` | X | 제품 상세 조회 |
| GET | `/api/products/user` | O | 사용자 저장 제품 조회 |
| GET | `/api/products/:id/download` | X | 제품 다운로드 URL |
| POST | `/api/products/:id/save` | O | 제품 저장 |
| POST | `/api/products/:id/like` | O | 제품 좋아요 |
| POST | `/api/products` | O | 제품 생성 (Brand 전용) |
| DELETE | `/api/products/:id` | O | 제품 삭제 (Brand 전용) |

#### 3.2.3 브랜드 (Brands)
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/api/brands/featured` | X | 추천 브랜드 목록 |
| GET | `/api/brands/search` | X | 브랜드 검색 |
| GET | `/api/brands/:id` | X | 브랜드 상세 조회 |
| GET | `/api/brands/assets` | O | 브랜드 에셋 조회 (Brand 전용) |

#### 3.2.4 프로필 (Profile)
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/api/profile` | O | 프로필 조회 |
| PUT | `/api/profile` | O | 프로필 업데이트 |
| PUT | `/api/profile/subscription` | O | 구독 업데이트 |

#### 3.2.5 3D Splat 변환
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/api/splat/convert` | O | 이미지 업로드 및 변환 시작 |
| GET | `/api/splat/status/:jobId` | O | 변환 상태 확인 |
| GET | `/api/splat/download/:jobId` | O | Splat 파일 다운로드 |
| GET | `/api/splat/stream/:jobId` | O | Splat 파일 스트리밍 (Range 지원) |

#### 3.2.6 프로젝트 (Projects)
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/api/projects` | O | 프로젝트 목록 조회 |
| POST | `/api/projects` | O | 프로젝트 생성 |
| GET | `/api/projects/:id` | O | 프로젝트 상세 조회 |
| DELETE | `/api/projects/:id` | O | 프로젝트 삭제 |

#### 3.2.7 비디오 삽입 <span style="color: blue">**[신규 핵심 기능]**</span>
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/api/video-insertion/process` | X | 비디오 삽입 (동기, deprecated) |
| POST | `/api/video-insertion/start` | X | 비디오 삽입 시작 (비동기) <span style="color: blue">**[추가]**</span> |
| GET | `/api/video-insertion/status/:jobId` | X | 작업 상태 조회 (SSE) <span style="color: blue">**[추가]**</span> |
| POST | `/api/video-insertion/resample` | X | 비디오 리샘플링 (프리뷰) <span style="color: blue">**[추가]**</span> |

#### 3.2.8 파일 관리 (Files)
| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/api/file/upload` | X | 파일 업로드 (GCS) |
| GET | `/api/file/url` | X | Signed URL 생성 <span style="color: blue">**[변경]**</span> |
| DELETE | `/api/file` | X | 파일 삭제 (GCS) |

---

## 4. 개별 API 명세서

### 4.1 인증 API

#### 4.1.1 Creator 로그인

**Endpoint 명칭**: Creator 로그인
**Endpoint 명세**: 이메일과 비밀번호를 사용하여 Creator 계정으로 로그인하고 JWT 토큰을 발급받습니다.

**Method**: `POST`

**URL**: `/api/auth/login/creator`

**Request Body**:
```json
{
  "email": "creator@example.com",
  "password": "mypassword123"
}
```

**Response** (성공):
```json
{
  "message": "로그인 성공"
}
```

**쿠키 설정**:
- Name: `jwt`
- Value: JWT 토큰 (서명: `process.env.JWT_SECRET`)
- HttpOnly: `true`
- Secure: `true` (프로덕션)
- MaxAge: 3600000 (1시간)

**에러 응답**:
```json
{
  "message": "잘못된 이메일 또는 비밀번호입니다."
}
```

**구현 파일**: `server/src/controllers/authController.ts:creatorLogin`

---

#### 4.1.2 Google OAuth 로그인 <span style="color: blue">**[신규]**</span>

**Endpoint 명칭**: Google OAuth 인증 시작
**Endpoint 명세**: Google OAuth 2.0을 사용하여 인증을 시작하고, 인증 완료 후 JWT 토큰을 발급받습니다.

**Method**: `GET`

**URL**: `/api/auth/google`

**Request Body**: 없음

**Response**: Google 인증 페이지로 리다이렉트

**Callback URL**: `/api/auth/google/callback`

**Callback Response** (성공):
- 리다이렉트: `/dashboard`
- 쿠키: JWT 토큰 설정

**비즈니스 로직**:
1. Google OAuth 2.0 인증 시작 (Scope: profile, email)
2. 사용자 승인 후 `/api/auth/google/callback`으로 리다이렉트
3. Google 프로필에서 이메일, 이름 추출
4. Creator 테이블에서 이메일로 조회
5. 존재하지 않으면 새 Creator 생성 (비밀번호 빈 문자열)
6. JWT 토큰 생성 및 쿠키 설정
7. `/dashboard`로 리다이렉트

**구현 파일**:
- `server/src/routes/authRoutes.ts`
- `server/src/config/passport.ts`
- `server/src/controllers/authController.ts:googleCallback`

---

### 4.2 제품 API

#### 4.2.1 제품 목록 조회 (커서 페이지네이션)

**Endpoint 명칭**: 제품 목록 조회
**Endpoint 명세**: 인증 없이 전체 제품 목록을 조회하며, 커서 기반 무한 스크롤과 정렬 옵션을 지원합니다.

**Method**: `GET`

**URL**: `/api/products`

**Query Parameters**:
```
limit=20                    # 페이지당 항목 수 (기본값: 20)
sortBy=NEWEST               # 정렬 기준 (NEWEST, POPULAR, VIEW_COUNT)
cursorId=123               # 커서 ID (다음 페이지용)
cursorValue=2025-01-01T00:00:00.000Z  # 커서 값 (정렬 기준에 따라 변경)
```

**Request Body**: 없음

**Response** (성공):
```json
{
  "data": [
    {
      "product_id": 1,
      "product_name": "3D 의자 모델",
      "brand_id": 5,
      "category": "가구",
      "image_url": "brand-assets/5/chair.jpg",
      "signedImageUrl": "https://storage.googleapis.com/brandvault-bucket/brand-assets/5/chair.jpg?X-Goog-Algorithm=...",
      "model_3d_url": "brand-assets/5/chair.glb",
      "view_count": 1250,
      "download_count": 340,
      "like_count": 89,
      "created_at": "2025-01-15T10:30:00.000Z",
      "brand": {
        "brand_id": 5,
        "brand_name": "ModernFurniture Inc."
      }
    },
    {
      "product_id": 2,
      "product_name": "노트북 3D 모델",
      "brand_id": 3,
      "category": "전자제품",
      "image_url": "brand-assets/3/laptop.jpg",
      "signedImageUrl": "https://storage.googleapis.com/brandvault-bucket/brand-assets/3/laptop.jpg?X-Goog-Algorithm=...",
      "model_3d_url": "brand-assets/3/laptop.ply",
      "view_count": 2100,
      "download_count": 580,
      "like_count": 156,
      "created_at": "2025-01-14T15:20:00.000Z",
      "brand": {
        "brand_id": 3,
        "brand_name": "TechBrand Co."
      }
    }
  ],
  "meta": {
    "hasMore": true,
    "nextCursorId": 2,
    "nextCursorValue": "2025-01-14T15:20:00.000Z"
  }
}
```

**정렬 옵션**:
- `NEWEST`: 최신순 (created_at DESC)
- `POPULAR`: 인기순 (download_count DESC)
- `VIEW_COUNT`: 조회수순 (view_count DESC)

**비즈니스 로직**:
1. Query 파라미터 파싱 (기본값 설정)
2. 정렬 기준에 따라 Prisma 쿼리 생성
3. 커서가 있으면 해당 위치부터 조회
4. GCS Signed URL 자동 생성 (15분 유효)
5. 다음 페이지 커서 정보 계산
6. 브랜드 정보 포함하여 반환

**구현 파일**: `server/src/controllers/productController.ts:getProducts`

---

#### 4.2.2 제품 검색

**Endpoint 명칭**: 제품 검색
**Endpoint 명세**: 키워드를 입력받아 제품명, 카테고리, 브랜드명에서 검색하여 결과를 반환합니다.

**Method**: `GET`

**URL**: `/api/products/search`

**Query Parameters**:
```
keyword=의자             # 검색 키워드 (필수)
limit=20                # 결과 제한 (기본값: 20)
```

**Request Body**: 없음

**Response** (성공):
```json
{
  "data": [
    {
      "product_id": 1,
      "product_name": "3D 의자 모델",
      "category": "가구",
      "signedImageUrl": "https://storage.googleapis.com/.../chair.jpg?...",
      "brand": {
        "brand_id": 5,
        "brand_name": "ModernFurniture Inc."
      }
    },
    {
      "product_id": 8,
      "product_name": "사무용 의자",
      "category": "가구",
      "signedImageUrl": "https://storage.googleapis.com/.../office-chair.jpg?...",
      "brand": {
        "brand_id": 7,
        "brand_name": "OfficePlus"
      }
    }
  ]
}
```

**비즈니스 로직**:
1. 키워드 대소문자 구분 없이 검색 (case-insensitive)
2. 제품명 OR 카테고리 OR 브랜드명에서 부분 일치 검색
3. 최신순 정렬
4. GCS Signed URL 생성
5. 결과 제한 (기본값: 20개)

**구현 파일**: `server/src/controllers/productController.ts:searchProducts`

---

#### 4.2.3 제품 다운로드 URL 생성

**Endpoint 명칭**: 제품 다운로드
**Endpoint 명세**: 제품 ID와 다운로드 타입(image 또는 model)을 입력받아 다운로드용 Signed URL을 생성하고, 다운로드 카운트를 증가시킵니다.

**Method**: `GET`

**URL**: `/api/products/:id/download`

**Path Parameters**:
- `id`: 제품 ID (예: 1)

**Query Parameters**:
```
type=model              # 다운로드 타입 (image | model)
```

**Request Body**: 없음

**Response** (성공):
```json
{
  "data": {
    "url": "https://storage.googleapis.com/brandvault-bucket/brand-assets/5/chair.glb?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=...&X-Goog-Date=20250129T120000Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&response-content-disposition=attachment%3B%20filename%3D%223D%20%EC%9D%98%EC%9E%90%20%EB%AA%A8%EB%8D%B8.glb%22&X-Goog-Signature=..."
  }
}
```

**에러 응답**:
```json
{
  "message": "파일 정보가 없습니다."
}
```

**비즈니스 로직**:
1. 제품 ID로 제품 조회
2. type 파라미터에 따라 파일 경로 선택 (image_url | model_3d_url)
3. 파일이 없으면 404 에러
4. 다운로드 카운트 증가 (download_count + 1)
5. GCS Signed URL 생성 (15분 유효)
6. Content-Disposition 헤더 설정 (파일명 포함)
7. URL 반환

**구현 파일**: `server/src/controllers/productController.ts:downloadProduct`

---

### 4.3 비디오 삽입 API <span style="color: blue">**[핵심 신규 기능]**</span>

#### 4.3.1 비디오 삽입 작업 시작 (비동기)

**Endpoint 명칭**: 비디오 제품 삽입 시작
**Endpoint 명세**: 비디오 파일과 삽입할 제품 이미지를 업로드하고, AI 기반 비디오 편집 작업을 비동기로 시작합니다. 작업 ID를 반환하며, SSE를 통해 실시간 진행 상태를 조회할 수 있습니다.

**Method**: `POST`

**URL**: `/api/video-insertion/start`

**Request Body** (multipart/form-data):
```
video: (binary)                    # 비디오 파일 (필수)
projectId: 123                     # 프로젝트 ID (필수)
objectImageUrl: https://gcs.../product.jpg  # 삽입할 제품 이미지 URL (필수)
targetX: 320                       # 삽입 위치 X 좌표 (필수)
targetY: 240                       # 삽입 위치 Y 좌표 (필수)
objectMaskPoints: [[100,100],[200,100],[200,200],[100,200]]  # 마스크 포인트 (선택)
```

**Response** (성공):
```json
{
  "success": true,
  "jobId": "a3f2b1c4-5678-9012-3456-789012345678",
  "message": "비디오 삽입 작업이 시작되었습니다."
}
```

**에러 응답**:
```json
{
  "success": false,
  "message": "비디오 파일이 제공되지 않았습니다."
}
```

**비즈니스 로직** (AI 파이프라인):
1. **파일 업로드**: 비디오 파일을 로컬 temp 디렉토리에 저장
2. **Job 생성**: UUID로 고유 작업 ID 생성
3. **비동기 작업 시작**:
   - 메모리 Map에 작업 상태 저장 (`processing`, 진행률 0%)
   - DB Project 테이블 상태 업데이트 (`processing`)
4. **백그라운드 처리**:
   - <span style="color: blue">**프레임 리샘플링 (5%)**</span>: 16프레임 이하로 비디오 축소 (속도 향상)
   - **이미지 다운로드 (10%)**: 제품 이미지 다운로드
   - **첫 프레임 추출 (15%)**: FFmpeg로 비디오 첫 프레임 추출
   - **GCS 업로드 (25%)**: 임시 파일들을 GCS에 업로드
   - **SAM2 마스크 생성 (35%)**: AI로 제품 마스크 자동 생성
   - **타겟 마스크 생성 (40%)**: Sharp로 원형 타겟 마스크 생성
   - **Anydoor 편집 (50%)**: 첫 프레임에 제품 삽입
   - **AnyV2V 비디오 생성 (70%)**: 전체 비디오 생성
   - <span style="color: blue">**프레임 복원 (90%)**</span>: 16프레임 → 원본 프레임 수 복원
   - **최종 저장 (100%)**: GCS에 최종 비디오 저장, 썸네일 생성
5. **임시 파일 정리**: 로컬 및 GCS 임시 파일 삭제

**진행률 업데이트** (SSE로 전송):
```json
// 진행 중
{"status":"processing","progress":35,"projectId":123}

// 완료
{"status":"completed","progress":100,"projectId":123,"thumbnail_url":"gcs://path/to/thumbnail.jpg"}

// 실패
{"status":"failed","progress":35,"projectId":123,"error":"마스크 생성 실패"}
```

**구현 파일**:
- `server/src/controllers/videoInsertController.ts:startVideoInsert`
- `server/src/services/videoInsertService.ts` (AI 파이프라인)
- `server/src/services/videoInsertJobService.ts` (작업 관리)

---

#### 4.3.2 작업 상태 조회 (SSE) <span style="color: blue">**[신규]**</span>

**Endpoint 명칭**: 비디오 삽입 작업 진행 상태 조회
**Endpoint 명세**: SSE (Server-Sent Events)를 사용하여 비디오 삽입 작업의 실시간 진행 상태를 스트리밍합니다.

**Method**: `GET`

**URL**: `/api/video-insertion/status/:jobId`

**Path Parameters**:
- `jobId`: 작업 ID (예: `a3f2b1c4-5678-9012-3456-789012345678`)

**Request Body**: 없음

**Response** (SSE Stream):
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"status":"processing","progress":5,"projectId":123}

data: {"status":"processing","progress":15,"projectId":123}

data: {"status":"processing","progress":35,"projectId":123}

data: {"status":"processing","progress":70,"projectId":123}

data: {"status":"completed","progress":100,"projectId":123,"thumbnail_url":"videos/123/thumbnail.jpg"}
```

**상태 값**:
- `pending`: 대기 중
- `processing`: 처리 중
- `completed`: 완료
- `failed`: 실패

**비즈니스 로직**:
1. SSE 연결 설정 (Keep-Alive)
2. 5초마다 작업 상태 조회
3. 상태 변경 시 클라이언트에 데이터 전송
4. 완료(`completed`) 또는 실패(`failed`) 시 연결 종료
5. 클라이언트 연결 종료 시 정리

**구현 파일**: `server/src/controllers/videoInsertJobController.ts:getJobStatus`

---

### 4.4 3D Splat 변환 API

#### 4.4.1 이미지 업로드 및 변환 시작

**Endpoint 명칭**: 3D Splat 변환 시작
**Endpoint 명세**: 인증된 사용자가 이미지 파일을 업로드하면, Replicate Trellis AI 모델을 사용하여 3D Gaussian Splat 모델로 변환하는 작업을 시작합니다.

**Method**: `POST`

**URL**: `/api/splat/convert`

**Request Body** (multipart/form-data):
```
images: (binary)[]              # 이미지 파일 배열 (최대 10개, 현재는 첫 번째만 사용)
```

**Response** (성공):
```json
{
  "message": "변환이 시작되었습니다.",
  "jobId": "b7e4c2d9-1234-5678-9012-345678901234",
  "status": "processing"
}
```

**에러 응답**:
```json
{
  "message": "최소 1개의 이미지가 필요합니다."
}
```

**비즈니스 로직**:
1. 이미지 파일 업로드 (로컬 temp 디렉토리)
2. Job ID 생성 (UUID)
3. 비동기 변환 작업 시작:
   - 이미지를 Base64 Data URI로 변환
   - Replicate Trellis 모델 호출
     - 모델: `firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c`
     - 파라미터:
       - `images`: [Base64 Data URI]
       - `texture_size`: 1024
       - `mesh_simplify`: 0.95
       - `generate_model`: true (GLB)
       - `save_gaussian_ply`: true (PLY)
   - GLB 또는 PLY 파일 다운로드
   - `/splats/{jobId}.{ext}` 경로에 저장
4. 상태: `processing` → `completed` (또는 `failed`)

**구현 파일**:
- `server/src/controllers/splatController.ts:uploadAndConvert`
- `server/src/services/splatService.ts:convertToSplat`

---

#### 4.4.2 Splat 파일 스트리밍 (Range 지원)

**Endpoint 명칭**: Splat 파일 스트리밍
**Endpoint 명세**: 3D 뷰어에서 Splat 파일을 스트리밍으로 로드할 수 있도록 Range 요청을 지원합니다.

**Method**: `GET`

**URL**: `/api/splat/stream/:jobId` 또는 `/api/splat/stream/:jobId.:ext`

**Path Parameters**:
- `jobId`: 작업 ID
- `ext`: 파일 확장자 (선택, splat/glb/ply)

**Request Headers** (선택):
```
Range: bytes=0-1023
```

**Response** (전체 파일):
```
Status: 200 OK
Content-Type: application/octet-stream
Content-Length: 1234567
Access-Control-Allow-Origin: *

(binary data)
```

**Response** (부분 파일, Range 요청 시):
```
Status: 206 Partial Content
Content-Type: application/octet-stream
Content-Range: bytes 0-1023/1234567
Content-Length: 1024
Access-Control-Allow-Origin: *

(binary data)
```

**비즈니스 로직**:
1. jobId로 파일 경로 확인 (splat/glb/ply 순서로 탐색)
2. 파일이 없으면 404 에러
3. Range 헤더 파싱
4. 파일 스트리밍 (전체 또는 부분)
5. CORS 헤더 설정

**구현 파일**: `server/src/controllers/splatController.ts:streamSplat`

---

### 4.5 파일 관리 API

#### 4.5.1 Signed URL 생성 <span style="color: blue">**[변경]**</span>

**Endpoint 명칭**: 파일 URL 조회
**Endpoint 명세**: GCS 파일 경로를 입력받아 시간 제한이 있는 Signed URL을 생성하여 반환합니다. 다운로드 파일명을 커스터마이징할 수 있습니다.

**Method**: `GET`

**URL**: `/api/file/url`

**Query Parameters**:
```
filePath=brand-assets/5/chair.jpg         # GCS 파일 경로 (필수)
downloadAs=의자_모델.jpg                    # 다운로드 파일명 (선택)
```

**Request Body**: 없음

**Response** (성공):
```json
{
  "temporaryUrl": "https://storage.googleapis.com/brandvault-bucket/brand-assets/5/chair.jpg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=...&X-Goog-Date=20250129T120000Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&response-content-disposition=attachment%3B%20filename%3D%22%EC%9D%98%EC%9E%90_%EB%AA%A8%EB%8D%B8.jpg%22&X-Goog-Signature=..."
}
```

**에러 응답**:
```json
{
  "error": "파일 경로가 제공되지 않았습니다."
}
```

**비즈니스 로직**:
1. Query 파라미터에서 filePath 추출 (필수)
2. downloadAs가 있으면 Content-Disposition 헤더에 포함
3. GCS Signed URL 생성 (15분 유효)
4. URL 반환

**보안**:
- Signed URL은 15분 후 자동 만료
- GCS 파일 경로만 노출, 실제 서버 경로 숨김
- 파일명 인코딩 (URL-safe)

**구현 파일**: `server/src/controllers/fileController.ts:getFileUrl`

---

## 5. 데이터베이스 설계

### 5.1 ERD 주요 엔티티

```
Creator (크리에이터)
├─ creator_id (PK)
├─ email (UNIQUE)
├─ password (bcrypt 해시)
├─ subscription_type (free/pro/enterprise)
└─ created_at

Brand (브랜드)
├─ brand_id (PK)
├─ brand_name
├─ contract_email (UNIQUE)
├─ logo_url
└─ asset_count (제품 수)

Product (제품)
├─ product_id (PK)
├─ brand_id (FK → Brand)
├─ product_name
├─ image_url (GCS 경로)
├─ model_3d_url (GCS 경로)
├─ view_count
├─ download_count
├─ like_count
└─ created_at

Project (프로젝트)
├─ project_id (PK)
├─ creator_id (FK → Creator)
├─ project_name
├─ status (pending/processing/completed/failed)
├─ progress (0-100)
├─ job_id (비디오 삽입 작업 ID)
└─ thumbnail_url

Product_Purchase (제품 구매/저장)
├─ purchase_id (PK)
├─ creator_id (FK → Creator)
├─ product_id (FK → Product)
└─ purchase_at

Platform_User (브랜드 사용자)
├─ user_id (PK)
├─ brand_id (FK → Brand)
├─ password
└─ user_authority_level
```

### 5.2 인덱스 전략

성능 최적화를 위한 복합 인덱스:
```sql
-- Product 테이블
CREATE INDEX idx_product_view ON Product(view_count DESC, product_id DESC);
CREATE INDEX idx_product_download ON Product(download_count DESC, product_id DESC);
CREATE INDEX idx_product_created ON Product(created_at DESC, product_id DESC);

-- Brand 테이블
CREATE INDEX idx_brand_asset_count ON Brand(asset_count);
```

### 5.3 관계 설정

- Creator ↔ Project: 1:N
- Creator ↔ Product_Purchase: 1:N
- Brand ↔ Product: 1:N
- Brand ↔ Platform_User: 1:N
- Product ↔ Product_Purchase: 1:N
- Project ↔ Product: N:M (through ProjectProducts)

---

## 6. 보안 및 인증

### 6.1 JWT 인증

**토큰 생성**:
```typescript
const token = jwt.sign(
  { userId: creator.creator_id, email: creator.email },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
```

**쿠키 설정**:
```typescript
res.cookie('jwt', token, {
  httpOnly: true,           // XSS 방지
  secure: isProduction,     // HTTPS 전용
  maxAge: 3600000,          // 1시간
  sameSite: 'strict'        // CSRF 방지
});
```

**미들웨어 검증**:
```typescript
// server/src/midwares/authMiddleware.ts
export const authenticateToken = (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).json({ message: '인증이 필요합니다.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    req.user = user;
    next();
  });
};
```

### 6.2 Google OAuth 2.0 <span style="color: blue">**[추가]**</span>

**Passport 설정**:
```typescript
// server/src/config/passport.ts
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  // 사용자 조회 또는 생성
  let creator = await prisma.creator.findUnique({
    where: { email: profile.emails[0].value }
  });

  if (!creator) {
    creator = await prisma.creator.create({
      data: {
        email: profile.emails[0].value,
        user_name: profile.displayName,
        password: ''  // Google 로그인은 비밀번호 불필요
      }
    });
  }

  // JWT 토큰 생성
  const token = jwt.sign({ userId: creator.creator_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return done(null, { creator, token });
}));
```

### 6.3 브랜드 소유권 검증

```typescript
// 제품 삭제 시 소유권 확인
const product = await prisma.product.findUnique({
  where: { product_id: parseInt(id) }
});

if (product.brand_id !== req.user.brandId) {
  return res.status(403).json({ message: '권한이 없습니다.' });
}
```

---

## 7. 파일 저장 시스템

### 7.1 GCS 구조 <span style="color: blue">**[변경]**</span>

**Bucket**: `brandvault-bucket` (환경 변수: `GCS_BUCKET_NAME`)

**디렉토리 구조**:
```
brandvault-bucket/
├── brand-assets/
│   ├── {brand_id}/
│   │   ├── {product_id}.jpg          # 제품 이미지
│   │   └── {product_id}.glb          # 3D 모델
├── uploads/
│   └── {filename}-{uuid}.ext         # 일반 파일 업로드
├── splats/
│   └── {job_id}.{glb|ply|splat}      # 3D Splat 변환 결과
├── videos/
│   ├── {project_id}/
│   │   ├── output.mp4                # 최종 비디오
│   │   └── thumbnail.jpg             # 썸네일
└── temp/
    ├── {job_id}/                      # 임시 파일 (작업 후 삭제)
    │   ├── object_mask.png
    │   ├── target_mask.png
    │   └── edited_frame.jpg
```

### 7.2 Signed URL 생성 <span style="color: blue">**[변경]**</span>

**목적**: GCS 파일을 시간 제한이 있는 URL로 제공하여 보안 강화

**생성 방법**:
```typescript
const [signedUrl] = await bucket.file(filePath).getSignedUrl({
  version: 'v4',
  action: 'read',
  expires: Date.now() + 15 * 60 * 1000,  // 15분 후 만료
  responseDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`
});
```

**장점**:
- URL 만료 시간 설정 (15분)
- 다운로드 파일명 커스터마이징
- GCS 버킷 권한 비공개 유지
- 무단 접근 방지

### 7.3 파일 경로 저장 전략

**DB 저장**: GCS 경로만 저장 (예: `brand-assets/5/chair.jpg`)
**URL 생성**: 런타임에 Signed URL 동적 생성

**장점**:
- DB에 URL을 저장하지 않아 공간 절약
- URL 만료 걱정 없음
- 보안 강화 (시간 제한)

---

## 8. 비동기 작업 처리

### 8.1 작업 상태 관리 <span style="color: blue">**[추가]**</span>

**메모리 Map 사용**:
```typescript
// server/src/services/videoInsertJobService.ts
const jobMap = new Map<string, JobStatus>();

interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  projectId: number;
  error?: string;
}
```

**DB와 메모리 이중 저장**:
- **메모리**: 빠른 조회, 실시간 진행률
- **DB**: 영구 저장, 서버 재시작 후 복구

### 8.2 서버 재시작 시 처리 <span style="color: blue">**[추가]**</span>

**중단된 작업 자동 정리**:
```typescript
// server/src/index.ts
import { cleanupInterruptedJobs } from './services/videoInsertJobService.js';

cleanupInterruptedJobs().then(() => {
  console.log('[Server] 중단된 작업 정리 완료');
});
```

**로직**:
1. DB에서 `status = 'processing'`인 프로젝트 조회
2. 상태를 `failed`로 변경
3. 에러 메시지: "서버 재시작으로 인한 작업 중단"

### 8.3 SSE 연결 관리 <span style="color: blue">**[추가]**</span>

**연결 유지**:
```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no');  // Nginx 버퍼링 비활성화
```

**정기 업데이트** (5초마다):
```typescript
const intervalId = setInterval(async () => {
  const job = jobMap.get(jobId);
  res.write(`data: ${JSON.stringify(job)}\n\n`);

  if (job.status === 'completed' || job.status === 'failed') {
    clearInterval(intervalId);
    res.end();
  }
}, 5000);
```

**클라이언트 연결 종료 처리**:
```typescript
req.on('close', () => {
  clearInterval(intervalId);
  res.end();
});
```

---

## 9. 핵심 비즈니스 로직 구현 검증

### 9.1 핵심 기능 1: AI 비디오 제품 삽입 <span style="color: blue">**[핵심]**</span>

**구현 파일**: `server/src/services/videoInsertService.ts`

**파이프라인 단계**:
1. 비디오 리샘플링 (16프레임)
2. 이미지 다운로드
3. 첫 프레임 추출 (FFmpeg)
4. GCS 업로드 (임시 파일)
5. SAM2 마스크 생성 (Replicate API)
6. 타겟 마스크 생성 (Sharp)
7. Anydoor 편집 (Replicate API)
8. AnyV2V 비디오 생성 (Replicate API)
9. 프레임 복원 (원본 프레임 수)
10. 최종 파일 저장 (GCS)
11. 임시 파일 정리

**AI 모델**:
- SAM2: 객체 세그멘테이션
- Anydoor: 이미지 편집
- AnyV2V: 비디오 생성

**최적화**:
- 프레임 리샘플링으로 처리 속도 3-5배 향상
- 프레임 복원으로 품질 유지

### 9.2 핵심 기능 2: 3D Splat 변환

**구현 파일**: `server/src/services/splatService.ts`

**변환 프로세스**:
1. 이미지 → Base64 Data URI
2. Replicate Trellis 모델 호출
3. GLB/PLY 파일 다운로드
4. 로컬 저장 (`/splats/{jobId}.{ext}`)
5. 상태 관리 (pending → processing → completed)

**AI 모델**:
- Trellis: 2D → 3D 변환 (firtoz/trellis)

### 9.3 핵심 기능 3: 제품 마켓플레이스

**구현 파일**: `server/src/controllers/productController.ts`

**주요 기능**:
1. 커서 기반 무한 스크롤
2. 정렬 (최신순, 인기순, 조회수순)
3. 검색 (제품명, 카테고리, 브랜드명)
4. Signed URL 자동 생성
5. 조회수/다운로드수 자동 증가
6. 브랜드 정보 포함

### 9.4 핵심 기능 4: 인증 시스템

**구현 파일**:
- `server/src/controllers/authController.ts`
- `server/src/config/passport.ts`

**주요 기능**:
1. JWT 기반 인증
2. Google OAuth 2.0 통합
3. Creator / Brand 이중 로그인
4. HttpOnly 쿠키 (XSS 방지)
5. 토큰 만료 (1시간)

---

## 10. API 테스트 가이드

### 10.1 Swagger UI

**URL**: `http://localhost:3000/api-docs`

**제공 정보**:
- 전체 API 목록
- Request/Response 스키마
- 인증 방법 (cookieAuth)
- 예시 요청/응답

### 10.2 주요 테스트 시나리오

#### 시나리오 1: Creator 로그인 → 제품 검색 → 제품 저장
```bash
# 1. 로그인
curl -X POST http://localhost:3000/api/auth/login/creator \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@example.com","password":"password123"}' \
  -c cookies.txt

# 2. 제품 검색
curl -X GET "http://localhost:3000/api/products/search?keyword=의자&limit=5" \
  -b cookies.txt

# 3. 제품 저장
curl -X POST http://localhost:3000/api/products/1/save \
  -b cookies.txt
```

#### 시나리오 2: 비디오 제품 삽입 (비동기)
```bash
# 1. 작업 시작
curl -X POST http://localhost:3000/api/video-insertion/start \
  -F "video=@/path/to/video.mp4" \
  -F "projectId=123" \
  -F "objectImageUrl=https://gcs.../product.jpg" \
  -F "targetX=320" \
  -F "targetY=240"

# Response: {"success":true,"jobId":"abc-123","message":"..."}

# 2. 실시간 진행률 조회 (SSE)
curl -N http://localhost:3000/api/video-insertion/status/abc-123

# Response (Stream):
# data: {"status":"processing","progress":5,"projectId":123}
# data: {"status":"processing","progress":35,"projectId":123}
# data: {"status":"completed","progress":100,"projectId":123}
```

---

## 11. 구현과 설계 일치 검증

### 11.1 API 엔드포인트 일치

| 설계 문서 | 실제 구현 | 일치 여부 |
|----------|----------|----------|
| 36개 엔드포인트 | 36개 라우트 | O |
| 인증 5개 | 5개 구현 | O |
| 제품 9개 | 9개 구현 | O |
| 비디오 삽입 4개 | 4개 구현 | O |
| SSE 지원 | SSE 구현 | O |

### 11.2 비즈니스 로직 일치

| 핵심 기능 | 설계 | 구현 | 일치 여부 |
|----------|------|------|----------|
| AI 비디오 삽입 | SAM2+Anydoor+AnyV2V | 구현 완료 | O |
| 프레임 리샘플링 | 16프레임 | 구현 완료 | O |
| 3D Splat 변환 | Trellis 모델 | 구현 완료 | O |
| Signed URL | 15분 만료 | 구현 완료 | O |
| 커서 페이지네이션 | 무한 스크롤 | 구현 완료 | O |

### 11.3 데이터베이스 일치

| 테이블 | 설계 | 구현 | 일치 여부 |
|--------|------|------|----------|
| Creator | O | O | O |
| Brand | O | O | O |
| Product | O | O | O |
| Project | O | O | O |
| Product_Purchase | O | O | O |
| 인덱스 (3개) | O | O | O |

---

## 부록 A: 환경 변수

### Backend 필수 환경 변수
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/brandvault
JWT_SECRET=your-secret-key-min-32-chars
GCS_BUCKET_NAME=brandvault-bucket
REPLICATE_API_TOKEN=r8_xxx...
```

### 선택 환경 변수
```bash
PORT=3000
NODE_ENV=production
CLIENT_URL=https://brand-vault.vercel.app
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_CALLBACK_URL=https://api.example.com/api/auth/google/callback
```

---

## 부록 B: 에러 코드

| 상태 코드 | 설명 | 예시 |
|----------|------|------|
| 200 | 성공 | 제품 조회 성공 |
| 201 | 생성 성공 | 프로젝트 생성 성공 |
| 206 | 부분 콘텐츠 | Range 요청 (Splat 스트리밍) |
| 400 | 잘못된 요청 | 필수 파라미터 누락 |
| 401 | 인증 필요 | JWT 토큰 없음 |
| 403 | 권한 없음 | 브랜드 소유권 없음 |
| 404 | 찾을 수 없음 | 제품 ID 없음 |
| 409 | 충돌 | 이메일 중복 |
| 500 | 서버 오류 | DB 연결 실패, AI API 오류 |

---

