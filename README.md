# BrandVault
hompage: https://brand-vault.vercel.app  

## 로컬 개발

You can start by
1. start frontend server
```bash
cd client
PORT=3001 npm start
```

2. start backend server
```bash
cd server
npm run dev
```

## Vercel 배포

이 프로젝트는 Vercel에 배포할 수 있도록 설정되어 있습니다.

자세한 배포 가이드는 [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)를 참고하세요.

### 빠른 배포

1. [Vercel](https://vercel.com)에 GitHub 계정으로 로그인
2. "New Project"에서 이 저장소 선택
3. 환경 변수 설정 후 배포

### 주요 파일
- `vercel.json`: Vercel 배포 설정
- `api/index.ts`: Serverless Functions 래퍼

.env files are not uploaded on github.
If you need them,
contact: hbg1345@gmail.com
