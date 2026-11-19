import mongoose from 'mongoose';
import { User, type UserAttributes } from '@haat/shared-backend';
import type { UserRole } from '@haat/shared-contracts';

export interface UserFilter {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const adminUserModel = {
  async listUsers(filter: UserFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filter.role) {
      query.role = filter.role;
    }

    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search.trim(), 'i');
      query.$or = [{ fullName: regex }, { email: regex }, { phoneNumber: regex }];
    }

    const trustedQuery = mongoose.trusted(query);

    const [users, total] = await Promise.all([
      User.find(trustedQuery).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(trustedQuery),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findUserById(id: string) {
    return User.findById(id).select('-passwordHash').lean();
  },

  async updateUserStatus(id: string, isActive: boolean) {
    return User.findByIdAndUpdate(id, { $set: { isActive } }, { new: true }).select('-passwordHash').lean();
  },
};
