import Router from 'express'
import { authenticateToken } from '../midwares/authMiddleware.js';
import * as projectController from '../controllers/projectController.js'

const router = Router();

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: 사용자 프로젝트 목록 조회
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 프로젝트 목록
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
router.get('/', authenticateToken, projectController.handleGetUserProjects)
router.post('/', authenticateToken, projectController.handleCreateProject)
router.get('/:id', authenticateToken, projectController.handleGetProjectById)
router.delete('/:id', authenticateToken, projectController.handleDeleteProject)

export default router;