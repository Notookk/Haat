import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@haat/shared-backend';
import { listUsersHandler, getUserHandler } from '../controllers/user.controller';
import { userListQuerySchema } from '../validators/user.validator';
import { rejectAdminWrites } from '../../../middleware/rejectAdminWrites';

export const adminUserRouter = Router();

adminUserRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

// Read-only user inspection
adminUserRouter.get('/', validate(userListQuerySchema, 'query'), listUsersHandler);
adminUserRouter.get('/:id', getUserHandler);

// Strictly reject any user modifications or status toggles
adminUserRouter.post('*', rejectAdminWrites);
adminUserRouter.put('*', rejectAdminWrites);
adminUserRouter.patch('*', rejectAdminWrites);
adminUserRouter.delete('*', rejectAdminWrites);
