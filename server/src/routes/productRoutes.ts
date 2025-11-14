import { Router } from 'express';
import { getProductList, getProductDetails, getProductDownloadUrl, handleGetUserProducts } from '../controllers/productController.js'
import { authenticateToken } from '../midwares/authMiddleware.js';
const router = Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: 제품 목록 조회
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 제품 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', getProductList);

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
 *     responses:
 *       200:
 *         description: 다운로드 URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: 다운로드 URL
 *       404:
 *         description: 제품을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/download', getProductDownloadUrl);
export default router;
