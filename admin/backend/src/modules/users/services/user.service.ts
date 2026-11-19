import { ERROR_CODES } from '@haat/shared-contracts';
import { AppError, AuditLog } from '@haat/shared-backend';
import { adminUserModel, type UserFilter } from '../models/user.model';
import type { UpdateUserStatusInput } from '../validators/user.validator';

export const adminUserService = {
  async listUsers(filter: UserFilter) {
    return adminUserModel.listUsers(filter);
  },

  async getUser(id: string) {
    const user = await adminUserModel.findUserById(id);
    if (!user) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found.', 404);
    }
    return user;
  },

  async setUserStatus(params: {
    userId: string;
    input: UpdateUserStatusInput;
    adminUserId: string;
    ipAddress?: string;
  }) {
    const existing = await adminUserModel.findUserById(params.userId);
    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found.', 404);
    }

    if (String(existing._id) === params.adminUserId) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Administrators cannot deactivate their own account.', 403);
    }

    const previousStatus = existing.isActive;
    const updated = await adminUserModel.updateUserStatus(params.userId, params.input.isActive);

    // Record immutable audit log
    await AuditLog.create({
      actorUserId: params.adminUserId,
      action: params.input.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: params.userId,
      metadata: {
        previousStatus,
        newStatus: params.input.isActive,
        reason: params.input.reason,
        targetEmail: existing.email,
        targetRole: existing.role,
      },
      ipAddress: params.ipAddress ?? null,
    });

    return updated;
  },
};
