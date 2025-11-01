import { Router } from 'express';
import { getProductList, handleGetUserProducts } from '../controllers/productController.js'
import { authenticateToken } from '../midwares/authMiddleware.js';
const router = Router();
router.get('/', getProductList);
router.get('/user', authenticateToken, handleGetUserProducts);

export default router;
