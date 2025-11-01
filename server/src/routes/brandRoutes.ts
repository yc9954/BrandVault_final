import { Router } from 'express';
// 💡 Controller 함수 임포트
import { getFeatureBrandList } from '../controllers/brandController.js'; 

const router = Router();

// GET /api/brands/featured
// 4행: 추천 브랜드 목록을 가져옵니다.
router.get('/featured', getFeatureBrandList);

export default router;