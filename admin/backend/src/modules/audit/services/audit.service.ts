import { adminAuditModel, type AuditLogFilter } from '../models/audit.model';

export const adminAuditService = {
  async listLogs(filter: AuditLogFilter) {
    return adminAuditModel.listLogs(filter);
  },
};
