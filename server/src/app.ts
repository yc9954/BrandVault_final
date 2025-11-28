import type { Request, Response } from 'express';
import "dotenv/config";
import cors from "cors";
import express from 'express';
import productRoutes from './routes/productRoutes.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import fileRoutes from './routes/fileRoutese.js'
import brandRoutes from './routes/brandRoutes.js';
import splatRoutes from './routes/splatRoutes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import passport from './config/passport.js';
import session from 'express-session';
import path from 'path';

const app = express();

app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
})); 

app.use(express.json());
app.use(cookieParser());

// 세션 설정 (Google OAuth용)
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24시간
    },
  })
);

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'BrandVault API Docs',
}));

// 정적 파일 서빙 (uploads, splats 디렉토리)
// 테스트 환경이 아닐 때만 정적 파일 서빙 활성화
// Jest 파싱 단계에서 import.meta.url을 피하기 위해 환경 변수나 process.cwd() 사용
if (process.env.NODE_ENV !== 'test') {
  // 프로덕션에서는 빌드된 파일 위치 기준으로 경로 설정
  // dist 폴더에서 실행되므로 상대 경로 사용
  const baseDir = process.env.STATIC_BASE_DIR || path.join(process.cwd(), 'src');
  app.use('/uploads', express.static(path.join(baseDir, '../uploads')));
  app.use('/splats', express.static(path.join(baseDir, '../splats')));
}

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/splat", splatRoutes);
app.use('/api/brands', brandRoutes);
app.use("/api/file", fileRoutes);

export default app;
