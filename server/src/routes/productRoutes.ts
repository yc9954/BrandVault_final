import { Router } from 'express';
import { getProductList, getProductDetails, handleGetUserProducts } from '../controllers/productController.js'
import { authenticateToken } from '../midwares/authMiddleware.js';
const router = Router();
router.get('/', getProductList);
router.get('/:id', getProductDetails);
router.get('/user', authenticateToken, handleGetUserProducts);

export default router;
