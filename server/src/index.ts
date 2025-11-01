import type { Request, Response } from 'express';
import "dotenv/config";
import cors from "cors";
import express from 'express';
import http from 'http';
import productRoutes from './routes/productRoutes.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import fileRoutes from './routes/fileRoutese.js'

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/projects", projectRoutes);

app.use("/api/file", fileRoutes)

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});