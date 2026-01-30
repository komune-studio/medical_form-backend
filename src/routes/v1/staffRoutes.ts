import { Router } from 'express';
import * as controller from '../../controllers/staffController';
import auth from '../../middlewares/auth';

const router = Router();

// Public routes (for dropdown in visitor form)
router.get('/active', controller.getActiveStaff);
router.get('/search', controller.bulkSearchStaff);

// Protected routes (require authentication)
router.post('/create', auth.auth, controller.createStaff);
router.get('/all', auth.auth, controller.getAllStaff);
router.get('/:id', auth.auth, controller.getStaffById);
router.put('/:id', auth.auth, controller.updateStaff);
router.delete('/:id', auth.auth, controller.deleteStaff);
router.post('/:id/reactivate', auth.auth, controller.reactivateStaff);

export default router;