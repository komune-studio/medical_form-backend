import { Router } from 'express';
import * as controller from '../../controllers/patientController';
import auth from '../../middlewares/auth';

const router = Router();

// Public routes (optional, bisa diproteksi juga)
router.get('/stats', auth.auth, controller.getPatientStats);
router.get('/validate/email', auth.auth, controller.validateEmail);
router.get('/validate/phone', auth.auth, controller.validatePhone);

// Protected routes (require authentication)
router.post('/create', auth.auth, controller.createPatient);
router.get('/all', auth.auth, controller.getAllPatients);
router.get('/search', auth.auth, controller.searchPatients);
router.get('/phone', auth.auth, controller.getPatientByPhone);
router.get('/email', auth.auth, controller.getPatientByEmail);
router.get('/code', auth.auth, controller.getPatientByCode);
router.get('/recent', auth.auth, controller.getRecentPatients);
router.get('/:id', auth.auth, controller.getPatientById);
router.put('/:id', auth.auth, controller.updatePatient);
router.delete('/:id', auth.auth, controller.deletePatient);

// Export route
router.get('/export/csv', auth.auth, controller.exportPatientsToCSV);

export default router;