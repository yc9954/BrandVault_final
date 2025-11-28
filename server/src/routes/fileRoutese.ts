import { Router } from 'express';
import multer from 'multer';
import { handleFileUpload, handleGetFileUrl,handleDeleteFile,} from '../controllers/fileController.js'

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB (동영상 업로드를 위해 증가)
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
 *       201:
 *         description: 파일 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 파일 업로드 성공
 *                 gcsPath:
 *                   type: string
 *                   description: GCS에 저장된 파일 경로
 *       400:
 *         description: 파일이 없거나 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
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
 *     summary: 파일 임시 URL 조회 (Signed URL)
 *     tags: [Files]
 *     parameters:
 *       - in: query
 *         name: filePath
 *         required: true
 *         schema:
 *           type: string
 *         description: GCS 파일 경로
 *       - in: query
 *         name: downloadAs
 *         schema:
 *           type: string
 *         description: 다운로드 파일명 (선택적)
 *     responses:
 *       200:
 *         description: 임시 URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 temporaryUrl:
 *                   type: string
 *                   description: 임시 접근 URL
 *       400:
 *         description: filePath 파라미터 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/url', handleGetFileUrl);

/**
 * @swagger
 * /api/file:
 *   delete:
 *     summary: 파일 삭제
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filePath
 *             properties:
 *               filePath:
 *                 type: string
 *                 description: 삭제할 GCS 파일 경로
 *     responses:
 *       200:
 *         description: 파일 삭제 성공
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 파일이 GCS에서 성공적으로 삭제되었습니다.
 *       400:
 *         description: filePath 파라미터 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/', handleDeleteFile);

export default router;