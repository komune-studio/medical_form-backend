import { Router } from 'express';
import * as controller from '../../controllers/userController';
import auth from '../../middlewares/auth';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/create', controller.createUser);          // register sebagai DOCTOR
router.post('/login', controller.login);

// ── Self (any authenticated user) ────────────────────────────────────────────
router.get('/self', auth.auth, controller.getSelfData);
router.post('/reset-password', auth.auth, controller.resetOwnPassword);
router.put('/profile', auth.auth, controller.updateOwnProfile);
router.delete('/account', auth.auth, controller.deleteOwnAccount);

// ── Admin only ────────────────────────────────────────────────────────────────
router.post('/admin/create', auth.authAdmin, controller.adminCreateUser);          // buat user dgn role bebas
router.get('/all', auth.authAdmin, controller.getAllUsers);
router.get('/all-with-inactive', auth.authAdmin, controller.getAllUsersWithInactive);
router.get('/by-role', auth.authAdmin, controller.getUsersByRole);                 // ?role=DOCTOR|ADMIN
router.get('/:id', auth.authAdmin, controller.getUserById);
router.patch('/:id/role', auth.authAdmin, controller.adminUpdateUserRole);
router.patch('/:id/reset-password', auth.authAdmin, controller.adminResetUserPassword);
router.delete('/:id', auth.authAdmin, controller.adminDeleteUser);
router.post('/:id/restore', auth.authAdmin, controller.adminRestoreUser);

export default router;