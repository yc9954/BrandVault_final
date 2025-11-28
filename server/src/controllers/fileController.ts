import type { Request, Response } from 'express';
import * as FileService from '../services/fileService.js'; 
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * [POST] /api/files/upload
 * 파일 업로드 컨트롤러
 */
export const handleFileUpload = async (req: Request, res: Response) => {
  try {
    // 1. Multer가 처리한 파일 확인 (라우터에서 .single('file')로 전달됨)
    if (!req.file) {
      return res.status(400).send('업로드할 파일이 없습니다.');
    }

    // 2. GCS에 저장할 경로 생성 (파일명 중복 방지)
    const originalName = req.file.originalname;
    const extension = path.extname(originalName);
    const basename = path.basename(originalName, extension);
    const destinationPath = `uploads/${basename}-${uuidv4()}${extension}`;

    // 3. '서비스'에 실제 로직 요청
    const gcsPath = await FileService.uploadFile(req.file, destinationPath);

    // 4. 클라이언트에 응답 (HTTP 상태 코드 및 결과)
    res.status(201).json({
      message: '파일 업로드 성공',
      gcsPath: gcsPath, // DB에 저장할 경로
    });

  } catch (error) {
    console.error('File upload error:', error);
    let errorMessage = "업로드 중 서버 오류 발생";
    if (error instanceof Error) {
      errorMessage = error.message;
      // Multer 에러 처리
      if (error.name === 'MulterError') {
        if (error.message.includes('File too large')) {
          return res.status(400).json({ message: '파일 크기가 너무 큽니다. (최대 500MB)' });
        }
        return res.status(400).json({ message: `파일 업로드 오류: ${error.message}` });
      }
    }
    res.status(500).json({ message: errorMessage });
  }
};

/**
 * [GET] /api/files/url
 * 임시 URL 생성 컨트롤러
 */
export const handleGetFileUrl = async (req: Request, res: Response) => {
  try {
    const { filePath, downloadAs } = req.query;

    if (!filePath) {
      return res.status(400).send('파일 경로(filePath)가 필요합니다.');
    }

    // '서비스'에 URL 생성 요청
    const url = await FileService.getSignedUrl(
      filePath as string,
      downloadAs as string | undefined
    );

    res.status(200).json({ temporaryUrl: url });

  } catch (error) {
    let errorMessage = "URL 생성 중 오류 발생";
    if (error instanceof Error) errorMessage = error.message;
    res.status(500).send(errorMessage);
  }
};

/**
 * [DELETE] /api/files
 * 파일 삭제 컨트롤러
 */
export const handleDeleteFile = async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).send('파일 경로(filePath)가 필요합니다.');
    }

    // '서비스'에 삭제 요청
    await FileService.deleteFile(filePath);
    res.status(200).send('파일이 GCS에서 성공적으로 삭제되었습니다.');

  } catch (error) {
    let errorMessage = "삭제 중 오류 발생";
    if (error instanceof Error) errorMessage = error.message;
    res.status(500).send(errorMessage);
  }
};