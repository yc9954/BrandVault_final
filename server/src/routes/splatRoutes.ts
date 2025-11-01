import Router from 'express';
import { authenticateToken } from '../midwares/authMiddleware.js';
import * as splatController from '../controllers/splatController.js';

const router = Router();

// 이미지 업로드 및 변환 시작
router.post(
  '/convert',
  authenticateToken,
  splatController.upload.array('images', 10), // 최대 10개 이미지
  splatController.handleUploadAndConvert
);

// 작업 상태 확인
router.get('/status/:jobId', authenticateToken, splatController.handleGetJobStatus);

// .splat 파일 다운로드
router.get('/download/:jobId', authenticateToken, splatController.handleDownloadSplat);

// .splat/.glb/.ply 파일 스트리밍 (뷰어용)
// 확장자 포함 요청 지원: /stream/:jobId 또는 /stream/:jobId.:ext
// 점(.)이 포함된 경우를 처리하기 위해 두 가지 라우트 패턴 사용
router.get('/stream/:jobId', authenticateToken, splatController.handleStreamSplat);
router.get('/stream/:jobId.:ext', authenticateToken, splatController.handleStreamSplat);

export default router;

