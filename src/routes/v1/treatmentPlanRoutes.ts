import { Router } from 'express';
import * as controller from '../../controllers/treatmentPlanController';
import auth from '../../middlewares/auth';

const router = Router();

// Both ADMIN & DOCTOR / THERAPIST
router.post('/create', auth.auth, controller.createPlan);
router.get('/all', auth.auth, controller.getAllPlans);
router.get('/:id', auth.auth, controller.getPlanById);
router.put('/:id', auth.auth, controller.updatePlan);

// ADMIN only
router.delete('/:id', auth.authAdmin, controller.deletePlan);

export default router;
