import { Router } from 'express';
import multer from 'multer';
import { processVideoInsertion, resampleVideoForPreview } from '../controllers/videoInsertController.js';
import { startVideoInsertion, getVideoInsertionStatus } from '../controllers/videoInsertJobController.js';

const router = Router();

// Multer 설정 (메모리 스토리지 사용)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/video-insertion/process:
 *   post:
 *     summary: Process video with object insertion (synchronous, deprecated)
 *     description: Inserts an object into a video by editing the first frame with Anydoor and propagating changes with AnyV2V
 *     tags: [Video Insertion]
 */
router.post(
  '/process',
  upload.single('video'),
  processVideoInsertion
);

/**
 * @swagger
 * /api/video-insertion/start:
 *   post:
 *     summary: Start video insertion job (asynchronous)
 *     description: Starts an asynchronous video insertion job and returns jobId
 *     tags: [Video Insertion]
 */
router.post(
  '/start',
  upload.single('video'),
  startVideoInsertion
);

/**
 * @swagger
 * /api/video-insertion/status/:jobId:
 *   get:
 *     summary: Get video insertion job status
 *     description: Returns the status and progress of a video insertion job
 *     tags: [Video Insertion]
 */
router.get(
  '/status/:jobId',
  getVideoInsertionStatus
);

/**
 * @swagger
 * /api/video-insertion/resample:
 *   post:
 *     summary: Resample video to 16 frames for preview
 *     description: Resamples a video to maximum 16 frames and returns a signed URL for preview
 *     tags: [Video Insertion]
 */
router.post(
  '/resample',
  upload.single('video'),
  resampleVideoForPreview
);

export default router;

