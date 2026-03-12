import { Router } from 'express';
import * as controller from '../../controllers/staffController';
import auth from '../../middlewares/auth';

const router = Router();

// Both ADMIN & DOCTOR (read)
router.get('/active', auth.auth, controller.getActiveStaff);
router.get('/search', auth.auth, controller.bulkSearchStaff);
router.get('/by-phone', auth.auth, controller.getStaffByPhone);
router.get('/all', auth.auth, controller.getAllStaff);
router.get('/:id', auth.auth, controller.getStaffById);

// ADMIN only (write)
router.post('/create', auth.authAdmin, controller.createStaff);
router.put('/:id', auth.authAdmin, controller.updateStaff);
router.delete('/:id', auth.authAdmin, controller.deleteStaff);
router.post('/:id/reactivate', auth.authAdmin, controller.reactivateStaff);

export default router;