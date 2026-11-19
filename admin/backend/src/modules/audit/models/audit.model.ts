import mongoose from 'mongoose';
import { AuditLog } from '@haat/shared-backend';

export interface AuditLogFilter {
  entityType?: string;
  action?: string;
  actorUserId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const adminAuditModel = {
  async listLogs(filter: AuditLogFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 25));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filter.entityType) {
      query.entityType = filter.entityType;
    }

    if (filter.action) {
      query.action = filter.action;
    } else {
      query.action = mongoose.trusted({ $nin: ['ADMIN_LOGIN', 'SELLER_LOGIN'] });
    }

    if (filter.actorUserId) {
      query.actorUserId = filter.actorUserId;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search.trim(), 'i');
      query.$or = [{ action: regex }, { entityType: regex }, { entityId: regex }, { ipAddress: regex }];
    }

    if (filter.startDate || filter.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (filter.startDate) {
        dateFilter.$gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        dateFilter.$lte = new Date(filter.endDate);
      }
      query.createdAt = dateFilter;
    }

    const trustedQuery = mongoose.trusted(query);

    const [logs, total] = await Promise.all([
      AuditLog.find(trustedQuery)
        .populate('actorUserId', 'fullName email phoneNumber role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(trustedQuery),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
};
