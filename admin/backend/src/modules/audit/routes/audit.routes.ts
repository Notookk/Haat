import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@haat/shared-backend';
import { listAuditLogsHandler } from '../controllers/audit.controller';
import { auditListQuerySchema } from '../validators/audit.validator';

export const adminAuditRouter = Router();

adminAuditRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));
adminAuditRouter.get('/', validate(auditListQuerySchema, 'query'), listAuditLogsHandler);
