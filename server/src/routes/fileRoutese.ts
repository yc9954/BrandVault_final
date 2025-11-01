import { Router } from 'express';
import multer from 'multer';
import { handleFileUpload, handleGetFileUrl,handleDeleteFile,} from '../controllers/fileController.js'

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

router.post('/upload', upload.single('file'), handleFileUpload);
router.get('/url', handleGetFileUrl);
router.delete('/', handleDeleteFile);

export default router;