import { type RequestHandler } from 'express';
import { adminUserService } from '../services/user.service';
import type { UserListQuery, UpdateUserStatusInput } from '../validators/user.validator';

export const listUsersHandler: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as UserListQuery;
    const result = await adminUserService.listUsers({
      search: query.search,
      role: query.role,
      isActive: query.status === 'ACTIVE' ? true : query.status === 'INACTIVE' ? false : undefined,
      page: query.page,
      limit: query.limit,
    });

    res.status(200).json({
      success: true,
      data: result.users,
      error: null,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const user = await adminUserService.getUser(req.params.id);
    res.status(200).json({
      success: true,
      data: { user },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatusHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as UpdateUserStatusInput;
    const user = await adminUserService.setUserStatus({
      userId: req.params.id,
      input,
      adminUserId: req.user!.userId,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: { user },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
