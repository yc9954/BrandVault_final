import { Router } from 'express';
import multer from 'multer';
import { getProductList, getProductDetails, getProductDownloadUrl, handleGetUserProducts, searchProducts, saveProduct, toggleLikeProduct, deleteProduct, createProduct } from '../controllers/productController.js'
import { authenticateToken } from '../midwares/authMiddleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: 제품 목록 조회 (커서 기반 페이지네이션)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [NEWEST, POPULAR, VIEW_COUNT]
 *           default: NEWEST
 *         description: 정렬 기준
 *       - in: query
 *         name: cursorId
 *         schema:
 *           type: integer
 *         description: 커서 ID (다음 페이지 조회용)
 *       - in: query
 *         name: cursorValue
 *         schema:
 *           type: string
 *         description: 커서 값 (정렬 기준에 따라 숫자 또는 날짜)
 *     responses:
 *       200:
 *         description: 제품 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     hasMore:
 *                       type: boolean
 *                     nextCursorId:
 *                       type: integer
 *                       nullable: true
 *                     nextCursorValue:
 *                       type: string
 *                       nullable: true
 */
router.get('/', getProductList);
router.get('/search', searchProducts);

/**
 * @swagger
 * /api/products/user:
 *   get:
 *     summary: 사용자 제품 목록 조회
 *     tags: [Products]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 사용자 제품 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user', authenticateToken, handleGetUserProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: 제품 상세 정보 조회
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 제품 ID
 *     responses:
 *       200:
 *         description: 제품 상세 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: 제품을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getProductDetails);

/**
 * @swagger
 * /api/products/{id}/download:
 *   get:
 *     summary: 제품 다운로드 URL 조회
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 제품 ID
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [image, model]
 *         description: 다운로드할 에셋 타입 (image 또는 model)
 *     responses:
 *       200:
 *         description: 다운로드 URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       description: 다운로드 URL
 *       400:
 *         description: 잘못된 요청 (type 파라미터 누락 또는 잘못된 값)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: 제품을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/download', getProductDownloadUrl);
router.post('/:id/save', authenticateToken, saveProduct);
router.post('/:id/like', authenticateToken, toggleLikeProduct);
router.delete('/:id', authenticateToken, deleteProduct);
router.post('/', authenticateToken, upload.single('image'), createProduct);
export default router;
