import type { Request, Response } from 'express';
import * as splatService from '../services/splatService.js';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Multer 설정
import multer from 'multer';

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  },
});

/**
 * 이미지 업로드 및 .splat 변환 시작
 */
export const handleUploadAndConvert = async (req: Request, res: Response) => {
  try {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return res.status(400).json({ message: '이미지 파일을 업로드해주세요.' });
    }

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    if (files.length === 0) {
      return res.status(400).json({ message: '최소 1개 이상의 이미지가 필요합니다.' });
    }

    // 작업 ID 생성
    const jobId = uuidv4();

    // 이미지 경로 배열
    const imagePaths = files.map((file) => (file as Express.Multer.File).path);

    // 비동기로 변환 시작 (실제로는 작업 큐 사용 권장)
    splatService
      .convertToSplat(imagePaths, jobId)
      .then(() => {
        console.log(`Job ${jobId} completed`);
      })
      .catch((error) => {
        console.error(`Job ${jobId} failed:`, error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      })
      .finally(() => {
        // 임시 업로드 파일 정리
        files.forEach(async (file) => {
          try {
            await fs.unlink((file as Express.Multer.File).path);
          } catch (err) {
            console.error('Failed to delete temp file:', err);
          }
        });
      });

    res.status(202).json({
      message: '변환이 시작되었습니다.',
      jobId,
      status: 'processing',
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    res.status(500).json({
      message: '업로드 중 오류가 발생했습니다.',
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    });
  }
};

/**
 * 작업 상태 확인
 */
export const handleGetJobStatus = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ message: 'jobId가 필요합니다.' });
    }
    const status = await splatService.getJobStatus(jobId);
    res.status(200).json({ jobId, status });
  } catch (error) {
    res.status(500).json({
      message: '상태 확인 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * 파일 다운로드 (.splat/.glb/.ply)
 */
export const handleDownloadSplat = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ message: 'jobId가 필요합니다.' });
    }
    const filePath = await splatService.getSplatFile(jobId);
    if (!filePath) {
      return res.status(404).json({ message: '3D 파일을 찾을 수 없습니다.' });
    }
    const actualExt = filePath.split('.').pop()?.toLowerCase() || 'splat';
    const downloadName = `${jobId}.${actualExt}`;
    res.download(filePath, downloadName, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: '다운로드 중 오류가 발생했습니다.' });
        }
      }
    });
  } catch (error) {
    console.error('Download handler error:', error);
    res.status(500).json({
      message: '다운로드 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * .splat/.glb/.ply 파일 스트리밍 (뷰어용)
 * 지원 형식: /api/splat/stream/:jobId 또는 /api/splat/stream/:jobId.:ext
 */
export const handleStreamSplat = async (req: Request, res: Response) => {
  console.log('=== Stream 요청 받음 ===');
  console.log('전체 URL:', req.url);
  console.log('params:', req.params);
  console.log('path:', req.path);
  
  try {
    let { jobId, ext } = req.params as { jobId: string; ext?: string };
    let requestedExt: string | null = null;
    
    if (ext) {
      requestedExt = ext.toLowerCase();
    } else if (jobId && jobId.includes('.')) {
      const parts = jobId.split('.');
      requestedExt = parts[parts.length - 1]?.toLowerCase() || null;
      jobId = parts.slice(0, -1).join('.');
    }
    
    console.log('파싱된 jobId:', jobId);
    console.log('파싱된 ext:', ext);
    console.log('요청된 확장자:', requestedExt);
    
    if (!jobId) {
      console.log('❌ jobId가 없음');
      return res.status(400).json({ message: 'jobId가 필요합니다.' });
    }
    
    const filePath = await splatService.getSplatFile(jobId);
    
    console.log('getSplatFile 결과:', filePath);
    console.log('파일 존재 여부:', filePath ? fsSync.existsSync(filePath) : false);
    
    if (!filePath) {
      console.log('❌ getSplatFile이 null 반환');
      return res.status(404).json({ message: '3D 파일을 찾을 수 없습니다.' });
    }
    
    // 파일 실제 존재 확인
    if (!fsSync.existsSync(filePath)) {
      console.log('❌ 파일 경로는 있지만 실제 파일이 없음:', filePath);
      return res.status(404).json({ message: '파일이 존재하지 않습니다.' });
    }
    
    console.log('✅ 파일 찾음:', filePath);
    
    const actualExt = filePath.split('.').pop()?.toLowerCase() || 'splat';
    if (requestedExt && requestedExt !== actualExt) {
      return res.status(400).json({
        message: `요청한 파일 형식(${requestedExt})과 실제 파일 형식(${actualExt})이 일치하지 않습니다.`,
      });
    }
    
    // CORS 헤더 (dev)
    const origin = req.headers.origin;
    const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:3001';
    if (origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    const mimeTypes: Record<string, string> = {
      glb: 'model/gltf-binary',
      gltf: 'model/gltf+json',
      ply: 'application/octet-stream',
      splat: 'application/octet-stream',
    };
    const mime = mimeTypes[actualExt] || 'application/octet-stream';
    
    const stats = await fs.stat(filePath);
    const total = stats.size;
    
    console.log('파일 크기:', total);
    
    const range = req.headers.range;
    if (range) {
      console.log('Range 요청:', range);
      const parts = range.replace(/bytes=/, '').split('-');
      const startStr = parts[0];
      const endStr = parts[1];
      
      if (!startStr) {
        res.setHeader('Content-Range', `bytes */${total}`);
        return res.status(416).end();
      }
      
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : total - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start >= total || end >= total) {
        res.setHeader('Content-Range', `bytes */${total}`);
        return res.status(416).end();
      }
      
      console.log(`✅ Partial content 전송: ${start}-${end}/${total}`);
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': mime,
        'Cache-Control': 'no-cache',
        'Content-Disposition': `inline; filename="${jobId}.${actualExt}"`,
      });
      const stream = fsSync.createReadStream(filePath, { start, end });
      stream.pipe(res);
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) res.status(500).end();
      });
      return;
    }
    
    // 전체 파일
    console.log('✅ 전체 파일 전송');
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': total,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Content-Disposition': `inline; filename="${jobId}.${actualExt}"`,
    });
    const stream = fsSync.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) res.status(500).end();
    });
  } catch (error) {
    console.error('❌ 파일 스트리밍 중 오류:', error);
    if (!res.headersSent) {
      res.status(500).json({
        message: '파일 스트리밍 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};