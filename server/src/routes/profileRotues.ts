import { Router } from 'express';
import { fetchProfile, updateProfile, updateSubscription } from '../controllers/profileController.js';
import { authenticateToken } from '../midwares/authMiddleware.js';

const router = Router();

// GET /api/profile/
// 토큰 인증을 거친 후 프로필 조회를 실행합니다.
router.get(
    '/', 
    authenticateToken, 
    fetchProfile
);

// PUT /api/profile/
// 프로필 정보(이름, 이메일)를 업데이트합니다.
router.put(
    '/',
    authenticateToken,
    updateProfile
);

// PUT /api/profile/subscription
// 요금제를 변경합니다.
router.put(
    '/subscription',
    authenticateToken,
    updateSubscription
);

export default router;