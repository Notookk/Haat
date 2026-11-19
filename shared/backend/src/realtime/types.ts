import type { UserRole, SellerStatus } from '@haat/shared-contracts';

export interface AuthenticatedSocketData {
  user?: {
    id: string;
    role: UserRole;
    email?: string;
    phoneNumber?: string;
    sellerId?: string;
    sellerStatus?: SellerStatus;
  };
  isGuest?: boolean;
}

export interface PlatformBroadcastEvent {
  type: string;
  payload: any;
  sourceService?: string;
  timestamp: string;
}
