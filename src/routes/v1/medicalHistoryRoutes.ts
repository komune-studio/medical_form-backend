import { Router } from 'express';
import * as controller from '../../controllers/medicalHistoryController';
import auth from '../../middlewares/auth';

const router = Router();

// Both ADMIN & DOCTOR
router.post('/create', auth.auth, controller.createMedicalHistory);
router.get('/all', auth.auth, controller.getAllMedicalHistories);
router.get('/search', auth.auth, controller.searchMedicalHistories);
router.get('/recent', auth.auth, controller.getRecentMedicalHistories);
router.get('/upcoming', auth.auth, controller.getUpcomingAppointments);
router.get('/date-range', auth.auth, controller.getByDateRange);
router.get('/stats', auth.auth, controller.getStatistics);
router.get('/patient/:patientId', auth.auth, controller.getMedicalHistoriesByPatient);
router.get('/progress-report/:patientId', auth.auth, controller.getPatientProgressReport);
router.get('/:id', auth.auth, controller.getMedicalHistoryById);
router.put('/:id', auth.auth, controller.updateMedicalHistory);

// ADMIN only — delete & export
router.delete('/:id', auth.authAdmin, controller.deleteMedicalHistory);
router.get('/export/csv', auth.authAdmin, controller.exportMedicalHistoriesToCSV);

export default router;