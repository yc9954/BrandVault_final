import { Router } from 'express'
import { handleCreatorLogin, handleBrandLogin, handleLogout, handleGoogleLogin, handleGoogleCallback } from '../controllers/authController.js';

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

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Google OAuth 로그인 시작
 *     tags: [Auth]
 *     description: Google 계정으로 로그인을 시작합니다. Google 인증 페이지로 리다이렉트됩니다.
 *     responses:
 *       302:
 *         description: Google 인증 페이지로 리다이렉트
 */
router.get('/google', handleGoogleLogin);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth 콜백
 *     tags: [Auth]
 *     description: Google 인증 후 콜백을 처리하고 JWT 토큰을 쿠키에 설정합니다.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Google에서 받은 인증 코드
 *     responses:
 *       302:
 *         description: 로그인 성공 시 대시보드로 리다이렉트, 실패 시 로그인 페이지로 리다이렉트
 *         headers:
 *           Set-Cookie:
 *             description: JWT 토큰이 HttpOnly 쿠키로 설정됩니다
 */
router.get('/google/callback', handleGoogleCallback);

export default router;