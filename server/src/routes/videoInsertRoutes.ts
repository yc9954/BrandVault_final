import { Router } from 'express';
import multer from 'multer';
import { processVideoInsertion } from '../controllers/videoInsertController.js';

const router = Router();

// Multer 설정 (메모리 스토리지 사용)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/video-insertion/process:
 *   post:
 *     summary: Process video with object insertion
 *     description: Inserts an object into a video by editing the first frame with Anydoor and propagating changes with AnyV2V
 *     tags: [Video Insertion]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *               - objectImage
 *               - targetX
 *               - targetY
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Input video file
 *               objectImage:
 *                 type: string
 *                 format: binary
 *                 description: Object image to insert
 *               targetX:
 *                 type: number
 *                 description: X coordinate for object insertion in first frame
 *               targetY:
 *                 type: number
 *                 description: Y coordinate for object insertion in first frame
 *               objectMaskPoints:
 *                 type: string
 *                 description: Optional JSON array of points for object mask [[x,y], [x,y], ...]
 *     responses:
 *       200:
 *         description: Video processing completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 outputVideoUrl:
 *                   type: string
 *                 gcsPath:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post(
  '/process',
  upload.single('video'), // video만 파일로 받고, objectImageUrl은 body에서 받음
  processVideoInsertion
);

export default router;

