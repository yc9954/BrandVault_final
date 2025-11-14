import { Router } from 'express';
import multer from 'multer';
import { handleFileUpload, handleGetFileUrl,handleDeleteFile,} from '../controllers/fileController.js'

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * @swagger
 * /api/file/upload:
 *   post:
 *     summary: 파일 업로드
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 업로드할 파일 (최대 10MB)
 *     responses:
 *       200:
 *         description: 파일 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: 업로드된 파일 URL
 *       400:
 *         description: 파일 크기 초과 또는 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', upload.single('file'), handleFileUpload);

/**
 * @swagger
 * /api/file/url:
 *   get:
 *     summary: 파일 URL 조회
 *     tags: [Files]
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         description: 파일 경로
 *     responses:
 *       200:
 *         description: 파일 URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: 파일 URL
 */
router.get('/url', handleGetFileUrl);

/**
 * @swagger
 * /api/file:
 *   delete:
 *     summary: 파일 삭제
 *     tags: [Files]
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         description: 삭제할 파일 경로
 *     responses:
 *       200:
 *         description: 파일 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: 파일을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/', handleDeleteFile);

export default router;