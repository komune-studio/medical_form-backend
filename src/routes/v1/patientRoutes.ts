import { Router } from 'express';
import * as controller from '../../controllers/patientController';
import auth from '../../middlewares/auth';

const router = Router();

// Both ADMIN & DOCTOR
router.get('/stats', auth.auth, controller.getPatientStats);
router.get('/validate/email', auth.auth, controller.validateEmail);
router.get('/validate/phone', auth.auth, controller.validatePhone);
router.post('/create', auth.auth, controller.createPatient);
router.get('/all', auth.auth, controller.getAllPatients);
router.get('/search', auth.auth, controller.searchPatients);
router.get('/phone', auth.auth, controller.getPatientByPhone);
router.get('/email', auth.auth, controller.getPatientByEmail);
router.get('/code', auth.auth, controller.getPatientByCode);
router.get('/recent', auth.auth, controller.getRecentPatients);
router.get('/:id', auth.auth, controller.getPatientById);
router.put('/:id', auth.auth, controller.updatePatient);

// ADMIN only — delete & export
router.delete('/:id', auth.authAdmin, controller.deletePatient);
router.get('/export/csv', auth.authAdmin, controller.exportPatientsToCSV);

export default router;