import { Server, type Socket } from 'socket.io';
export { Server, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { SOCKET_ROOMS } from '@haat/shared-contracts';
import { verifyAccessToken } from '../utils/tokens';
import { User } from '../models/User';
import { SellerProfile } from '../models/SellerProfile';
import { logger } from '../lib/logger';
import type { AuthenticatedSocketData } from './types';

export function createSocketServer(
  httpServer: HttpServer,
  options?: {
    serviceName?: string;
    allowedOrigins?: string[];
  },
): Server {
  const serviceName = options?.serviceName || 'haat-service';

  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow all development and production SPA origins
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 20000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Handshake Authentication & Strict Server-Side Room Assignment
  io.use(async (socket: Socket<any, any, any, AuthenticatedSocketData>, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization ||
        (socket.handshake.query?.token as string | undefined);

      // 1. Guest Connections (e.g. anonymous buyers viewing public catalogue)
      if (!authHeader) {
        socket.data.isGuest = true;
        return next();
      }

      const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

      // 2. Token Verification
      let payload;
      try {
        payload = verifyAccessToken(rawToken);
      } catch {
        return next(new Error('INVALID_TOKEN'));
      }

      // 3. User Identity Validation
      const user = await User.findById(payload.userId);
      if (!user || !user.isActive) {
        return next(new Error('USER_INACTIVE_OR_NOT_FOUND'));
      }

      // 4. Role-based Server-Side Room Assignment
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        socket.data.user = {
          id: user._id.toString(),
          role: user.role,
          email: user.email ?? undefined,
          phoneNumber: user.phoneNumber,
        };
        return next();
      }

      if (user.role === 'SELLER') {
        const seller = await SellerProfile.findOne({ userId: user._id });

        // Section 7.A: Strictly reject blocked sellers from connecting
        if (seller && seller.status === 'BLOCKED') {
          return next(new Error('SELLER_ACCOUNT_BLOCKED'));
        }

        socket.data.user = {
          id: user._id.toString(),
          role: 'SELLER',
          sellerId: seller ? seller._id.toString() : undefined,
          sellerStatus: seller ? seller.status : undefined,
          email: user.email ?? undefined,
          phoneNumber: user.phoneNumber,
        };
        return next();
      }

      // Buyer Role
      socket.data.user = {
        id: user._id.toString(),
        role: 'BUYER',
        email: user.email ?? undefined,
        phoneNumber: user.phoneNumber,
      };
      return next();
    } catch (err: any) {
      logger.error('Socket authentication error during handshake', { err: String(err), serviceName });
      return next(new Error('INTERNAL_AUTH_ERROR'));
    }
  });

  io.on('connection', (socket: Socket<any, any, any, AuthenticatedSocketData>) => {
    const user = socket.data.user;

    // Derived server-side room joins:
    if (socket.data.isGuest) {
      void socket.join(SOCKET_ROOMS.CATALOG_PUBLIC);
      logger.debug('Guest socket connected to public catalog', { socketId: socket.id, serviceName });
    } else if (user) {
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        void socket.join(SOCKET_ROOMS.ADMIN_MONITORING);
        logger.debug('Admin socket joined monitoring room', { socketId: socket.id, userId: user.id, role: user.role });
      } else if (user.role === 'SELLER') {
        if (user.sellerId) {
          void socket.join(SOCKET_ROOMS.sellerRoom(user.sellerId));
        }
        void socket.join(`seller:user:${user.id}`);
        void socket.join(SOCKET_ROOMS.CATALOG_PUBLIC);
        logger.debug('Seller socket joined private status room', {
          socketId: socket.id,
          sellerId: user.sellerId,
          status: user.sellerStatus,
        });
      } else if (user.role === 'BUYER') {
        void socket.join(SOCKET_ROOMS.buyerRoom(user.id));
        void socket.join(SOCKET_ROOMS.CATALOG_PUBLIC);
        logger.debug('Buyer socket joined buyer & catalog rooms', { socketId: socket.id, buyerId: user.id });
      }
    }

    // Ping / Heartbeat
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', (reason) => {
      logger.debug('Socket disconnected', { socketId: socket.id, reason: String(reason), serviceName });
    });
  });

  return io;
}
