import { Router } from 'express';
import { getProductList, getProductDetails, getProductDownloadUrl, handleGetUserProducts } from '../controllers/productController.js'
import { authenticateToken } from '../midwares/authMiddleware.js';
const router = Router();
router.get('/', getProductList);
router.get('/:id', getProductDetails);
router.get('/user', authenticateToken, handleGetUserProducts);
router.get('/:id/download', getProductDownloadUrl);
export default router;
