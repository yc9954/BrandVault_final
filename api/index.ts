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
app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001')
}));

app.use(express.json());
app.use(cookieParser());

// API routes - Vercel에서는 /api로 시작하는 요청이 이미 /api/index로 라우팅됨
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/projects", projectRoutes);
app.use("/splat", splatRoutes);

// Export the Express app as a Vercel serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel의 요청/응답을 Express 형식으로 변환
  return app(req as Request, res as Response);
}

