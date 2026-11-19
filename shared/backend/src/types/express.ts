import type { UserRole } from '@haat/shared-contracts';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        userId: string;
        role: UserRole;
      };
    }
  }
}

export type {};
