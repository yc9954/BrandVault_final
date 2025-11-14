import { Router } from 'express'
import { handleCreatorLogin, handleBrandLogin, handleLogout, } from '../controllers/authController.js';

const router = Router();

/**
 * @swagger
 * /api/auth/login/creator:
 *   post:
 *     summary: Creator 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: creator@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *         headers:
 *           Set-Cookie:
 *             description: JWT 토큰이 HttpOnly 쿠키로 설정됩니다
 *             schema:
 *               type: string
 *               example: jwt=token_here; HttpOnly; Secure; SameSite=None
 *       401:
 *         description: 로그인 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login/creator', handleCreatorLogin);

/**
 * @swagger
 * /api/auth/login/brand:
 *   post:
 *     summary: Brand 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: brand@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *         headers:
 *           Set-Cookie:
 *             description: JWT 토큰이 HttpOnly 쿠키로 설정됩니다
 *             schema:
 *               type: string
 *               example: jwt=token_here; HttpOnly; Secure; SameSite=None
 *       401:
 *         description: 로그인 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login/brand', handleBrandLogin);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/logout', handleLogout);

export default router;