import { Router } from 'express';
import { fetchProfile } from '../controllers/profileController.js';
import { authenticateToken } from '../midwares/authMiddleware.js';

const router = Router();

// GET /creator/profile
// 토큰 인증을 거친 후 프로필 조회를 실행합니다.
router.get(
    '/', 
    authenticateToken, 
    fetchProfile
); 

export default router;