import { Router } from 'express';
import * as controller from '../../controllers/userController';
import auth from '../../middlewares/auth';

const router = Router();

router.post('/create', controller.createUser);
router.post('/login', controller.login);
router.get('/self', auth.auth, controller.getSelfData);
router.get('/all', auth.auth, controller.getAllUsers);
router.post('/reset-password', auth.auth, controller.resetOwnPassword);
router.put('/profile', auth.auth, controller.updateOwnProfile);
router.delete('/account', auth.auth, controller.deleteOwnAccount);

export default router;