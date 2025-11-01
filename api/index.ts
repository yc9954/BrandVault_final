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

// Export the Express app as a Vercel serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel의 요청/응답을 Express 형식으로 변환
  return app(req as Request, res as Response);
}

