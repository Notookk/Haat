import { asyncHandler, sendSuccess } from '@haat/shared-backend';
import { adminAuditService } from '../services/audit.service';
import type { AuditListQuery } from '../validators/audit.validator';

export const listAuditLogsHandler = asyncHandler(async (req, res) => {
  const query = req.query as unknown as AuditListQuery;

  const result = await adminAuditService.listLogs({
    page: query.page,
    limit: query.limit,
    entityType: query.entityType,
    action: query.action,
    actorUserId: query.actorUserId,
    search: query.search,
    startDate: query.startDate,
    endDate: query.endDate,
  });

  return sendSuccess(res, result.logs, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});
