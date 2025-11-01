// Vercel Serverless Function wrapper for Express app
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import productRoutes from '../server/src/routes/productRoutes.js';
import authRoutes from '../server/src/routes/authRoutes.js';
import projectRoutes from '../server/src/routes/projectRoutes.js';
import splatRoutes from '../server/src/routes/splatRoutes.js';

const app = express();

// CORS 설정 - Vercel 배포 환경에서 동적으로 origin 설정
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null,
  'http://localhost:3001'
].filter(Boolean) as string[];

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    // origin이 없거나 allowedOrigins에 있으면 허용
    if (!origin || allowedOrigins.some(allowed => origin.includes(allowed.replace('https://', '').replace('http://', '')))) {
      callback(null, true);
    } else {
      callback(null, true); // 임시로 모두 허용 (나중에 수정 가능)
    }
  }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// API routes - Vercel의 rewrites를 통해 /api/(.*)가 /api/index로 라우팅되므로
// 실제 요청 경로는 /api/auth/login/creator 형태이지만,
// Express에서는 /api를 제거한 경로로 매칭해야 함
// 따라서 원래 서버와 동일하게 /api 경로를 유지
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/splat", splatRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for unmatched API routes
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Not Found', 
    message: `API route ${req.method} ${req.path} not found`,
    path: req.path,
    url: req.url
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Express error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

// Export the Express app as a Vercel serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel의 rewrites를 통해 /api/*가 /api/index로 라우팅되지만,
  // 원본 경로는 x-vercel-rewrite 헤더나 req.url에 포함될 수 있습니다.
  // req.url이 /api/index인 경우 원본 경로를 복원해야 합니다.
  
  // 원본 URL 복원 - rewrites로 인해 변경된 경로를 원본 경로로 복원
  const originalUrl = req.url || '/api/index';
  let pathToUse = originalUrl;
  
  // x-vercel-rewrite 헤더에서 원본 경로 확인 (있을 경우)
  const rewriteHeader = req.headers['x-vercel-rewrite'] || req.headers['x-rewrite-url'];
  if (rewriteHeader) {
    pathToUse = rewriteHeader as string;
  } else if (originalUrl === '/api/index' || originalUrl.startsWith('/api/index?')) {
    // req.url이 /api/index인 경우, x-path 또는 x-matched-path 헤더 확인
    const matchedPath = req.headers['x-matched-path'] || req.headers['x-path'];
    if (matchedPath) {
      pathToUse = matchedPath as string;
    }
  }
  
  // Express Request 객체 생성 및 원본 경로 설정
  const expressReq = req as any;
  if (pathToUse !== originalUrl) {
    expressReq.url = pathToUse;
    expressReq.originalUrl = pathToUse;
    expressReq.path = pathToUse.split('?')[0];
  }
  
  // 디버깅을 위한 로그
  console.log('API Request:', {
    method: req.method,
    originalUrl: originalUrl,
    pathToUse: pathToUse,
    headers: {
      'x-vercel-rewrite': req.headers['x-vercel-rewrite'],
      'x-rewrite-url': req.headers['x-rewrite-url'],
      'x-matched-path': req.headers['x-matched-path'],
      'x-path': req.headers['x-path'],
    },
    query: req.query,
  });
  
  // Express 앱에 요청 전달
  return app(expressReq, res as any);
}

