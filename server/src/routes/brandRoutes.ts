import { Router } from 'express';
// 💡 Controller 함수 임포트
import { getFeatureBrandList, searchBrandsController, getBrandById } from '../controllers/brandController.js';

const router = Router();

/**
 * @swagger
 * /api/brands/featured:
 *   get:
 *     summary: 추천 브랜드 목록 조회
 *     tags: [Brands]
 *     responses:
 *       200:
 *         description: 추천 브랜드 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/featured', getFeatureBrandList);
router.get('/search', searchBrandsController);
router.get('/:id', getBrandById);

export default router;