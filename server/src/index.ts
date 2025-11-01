import type { Request, Response } from 'express';
import "dotenv/config";
import cors from "cors";
import express from 'express';
import http from 'http';
import productRoutes from './routes/productRoutes.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import splatRoutes from './routes/splatRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL || 'http://localhost:3001'
}));

app.use(express.json());
app.use(cookieParser());

// 정적 파일 서빙 (uploads, splats 디렉토리)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/splats', express.static(path.join(__dirname, '../splats')));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/splat", splatRoutes);

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});