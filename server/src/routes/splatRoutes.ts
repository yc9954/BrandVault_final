import Router from 'express';
import { authenticateToken } from '../midwares/authMiddleware.js';
import * as splatController from '../controllers/splatController.js';

const router = Router();

/**
 * @swagger
 * /api/splat/convert:
 *   post:
 *     summary: 이미지 업로드 및 3D Splat 변환 시작
 *     tags: [Splat]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 최대 10개의 이미지 파일
 *     responses:
 *       202:
 *         description: 변환 작업 시작 (Accepted)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 변환이 시작되었습니다.
 *                 jobId:
 *                   type: string
 *                   description: 작업 ID
 *                 status:
 *                   type: string
 *                   example: processing
 *       400:
 *         description: 잘못된 요청 (이미지 파일 없음)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/convert',
  authenticateToken,
  splatController.upload.array('images', 10), // 최대 10개 이미지
  splatController.handleUploadAndConvert
);

/**
 * @swagger
 * /api/splat/status/{jobId}:
 *   get:
 *     summary: Splat 변환 작업 상태 확인
 *     tags: [Splat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: 작업 ID
 *     responses:
 *       200:
 *         description: 작업 상태
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, completed, failed]
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/status/:jobId', authenticateToken, splatController.handleGetJobStatus);

/**
 * @swagger
 * /api/splat/download/{jobId}:
 *   get:
 *     summary: .splat 파일 다운로드
 *     tags: [Splat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: 작업 ID
 *     responses:
 *       200:
 *         description: 파일 다운로드
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/download/:jobId', authenticateToken, splatController.handleDownloadSplat);

/**
 * @swagger
 * /api/splat/stream/{jobId}:
 *   get:
 *     summary: .splat/.glb/.ply 파일 스트리밍 (뷰어용)
 *     tags: [Splat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: 작업 ID
 *       - in: path
 *         name: ext
 *         required: false
 *         schema:
 *           type: string
 *           enum: [splat, glb, ply]
 *         description: 파일 확장자 (선택적)
 *     responses:
 *       200:
 *         description: 파일 스트림
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stream/:jobId', authenticateToken, splatController.handleStreamSplat);
router.get('/stream/:jobId.:ext', authenticateToken, splatController.handleStreamSplat);

export default router;

