import { Router } from 'express';
import * as controller from '../../controllers/medicalHistoryController';
import auth from '../../middlewares/auth';

const router = Router();

// Protected routes (require authentication)
router.post('/create', auth.auth, controller.createMedicalHistory);
router.get('/all', auth.auth, controller.getAllMedicalHistories);
router.get('/search', auth.auth, controller.searchMedicalHistories);
router.get('/recent', auth.auth, controller.getRecentMedicalHistories);
router.get('/upcoming', auth.auth, controller.getUpcomingAppointments);
router.get('/date-range', auth.auth, controller.getByDateRange);
router.get('/stats', auth.auth, controller.getStatistics); // ✅ GANTI JADI getStatistics
router.get('/patient/:patientId', auth.auth, controller.getMedicalHistoriesByPatient);
router.get('/progress-report/:patientId', auth.auth, controller.getPatientProgressReport); // ⚠️ HARUS DI ATAS /:id
router.get('/:id', auth.auth, controller.getMedicalHistoryById);
router.put('/:id', auth.auth, controller.updateMedicalHistory);
router.delete('/:id', auth.auth, controller.deleteMedicalHistory);

// Export route
router.get('/export/csv', auth.auth, controller.exportMedicalHistoriesToCSV);

export default router;