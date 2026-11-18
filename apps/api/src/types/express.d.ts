import type { UserRole } from '@haat/shared';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

export {};
