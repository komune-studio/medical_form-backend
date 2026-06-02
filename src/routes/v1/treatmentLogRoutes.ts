import { Router } from 'express';
import * as controller from '../../controllers/treatmentLogController';
import auth from '../../middlewares/auth';

const router = Router();

// Both ADMIN & DOCTOR / THERAPIST
router.post('/create', auth.auth, controller.createLog);
router.get('/all', auth.auth, controller.getAllLogs);
router.get('/follow-up', auth.auth, controller.getFollowUpLogs);
router.get('/:id', auth.auth, controller.getLogById);
router.put('/:id', auth.auth, controller.updateLog);

// ADMIN only
router.delete('/:id', auth.authAdmin, controller.deleteLog);

export default router;
