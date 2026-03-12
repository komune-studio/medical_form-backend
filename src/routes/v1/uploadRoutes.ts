import { Router } from 'express';
import * as uploadController from '../../controllers/uploadController';
import auth from '../../middlewares/auth';

const router = Router();

// Both ADMIN & DOCTOR
router.post('/public/file', auth.auth, uploadController.uploadSingleFilePublic);
router.post('/public/image', auth.auth, uploadController.uploadSingleFilePublicImage);

// ADMIN only
router.post('/public/3dfile', auth.authAdmin, uploadController.uploadSingleFilePublic);

export default router;