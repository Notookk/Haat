import type { Server } from 'socket.io';
import {
  SOCKET_EVENTS,
  SOCKET_ROOMS,
  type SellerStatusChangedPayload,
  type CatalogVisibilityChangedPayload,
  type AdminSellerUpdatedPayload,
} from '@haat/shared-contracts';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import type { PlatformBroadcastEvent } from './types';

export class RealtimeEventBus {
  private io: Server | null = null;
  private currentPort = 0;
  private peerPorts: number[] = [];

  init(options: { io: Server; currentPort: number; peerPorts?: number[] }) {
    this.io = options.io;
    this.currentPort = options.currentPort;
    this.peerPorts = options.peerPorts || [4000, 6000, 7100].filter((p) => p !== options.currentPort);
  }

  /**
   * Dispatches the event locally to this service's connected Socket.IO clients.
   */
  dispatchLocal(event: PlatformBroadcastEvent) {
    if (!this.io) return;

    const { type, payload } = event;

    switch (type) {
      case SOCKET_EVENTS.SELLER_STATUS_CHANGED: {
        const p = payload as SellerStatusChangedPayload;
        // Emit to private seller room
        this.io.to(SOCKET_ROOMS.sellerRoom(p.sellerId)).emit(SOCKET_EVENTS.SELLER_STATUS_CHANGED, p);
        // Also emit to admin monitoring
        this.io.to(SOCKET_ROOMS.ADMIN_MONITORING).emit(SOCKET_EVENTS.SELLER_STATUS_CHANGED, p);

        // Specific sub-events for targeted frontend listener hooks
        if (p.newStatus === 'ACTIVE') {
          const subEvent =
            p.previousStatus === 'BLOCKED' ? SOCKET_EVENTS.SELLER_UNBLOCKED : SOCKET_EVENTS.SELLER_APPROVED;
          this.io.to(SOCKET_ROOMS.sellerRoom(p.sellerId)).emit(subEvent, p);
          if (p.userId) this.io.to(`seller:user:${p.userId}`).emit(subEvent, p);
        } else if (p.newStatus === 'REJECTED') {
          this.io.to(SOCKET_ROOMS.sellerRoom(p.sellerId)).emit(SOCKET_EVENTS.SELLER_REJECTED, p);
          if (p.userId) this.io.to(`seller:user:${p.userId}`).emit(SOCKET_EVENTS.SELLER_REJECTED, p);
        } else if (p.newStatus === 'BLOCKED') {
          this.io.to(SOCKET_ROOMS.sellerRoom(p.sellerId)).emit(SOCKET_EVENTS.SELLER_BLOCKED, p);
          this.io.to(SOCKET_ROOMS.sellerRoom(p.sellerId)).emit(SOCKET_EVENTS.SELLER_SESSION_REVOKED, p);
          if (p.userId) {
            this.io.to(`seller:user:${p.userId}`).emit(SOCKET_EVENTS.SELLER_BLOCKED, p);
            this.io.to(`seller:user:${p.userId}`).emit(SOCKET_EVENTS.SELLER_SESSION_REVOKED, p);
          }

          // Forcefully terminate all socket connections in this seller's room
          this.io.in(SOCKET_ROOMS.sellerRoom(p.sellerId)).disconnectSockets(true);
          if (p.userId) this.io.in(`seller:user:${p.userId}`).disconnectSockets(true);
        }
        if (p.userId) {
          this.io.to(`seller:user:${p.userId}`).emit(SOCKET_EVENTS.SELLER_STATUS_CHANGED, p);
        }
        break;
      }

      case SOCKET_EVENTS.CATALOG_VISIBILITY_CHANGED: {
        const p = payload as CatalogVisibilityChangedPayload;
        // Broadcast to all buyers and public visitors
        this.io.to(SOCKET_ROOMS.CATALOG_PUBLIC).emit(SOCKET_EVENTS.CATALOG_VISIBILITY_CHANGED, p);
        break;
      }

      case SOCKET_EVENTS.APPLICATION_CREATED: {
        this.io.to(SOCKET_ROOMS.ADMIN_MONITORING).emit(SOCKET_EVENTS.APPLICATION_CREATED, payload);
        break;
      }

      case SOCKET_EVENTS.ADMIN_SELLER_UPDATED: {
        const p = payload as AdminSellerUpdatedPayload;
        this.io.to(SOCKET_ROOMS.ADMIN_MONITORING).emit(SOCKET_EVENTS.ADMIN_SELLER_UPDATED, p);
        break;
      }

      case SOCKET_EVENTS.ORDER_CREATED: {
        const p = payload as { sellerId: string };
        if (p.sellerId) {
          this.io.to(SOCKET_ROOMS.sellerRoom(p.sellerId)).emit(SOCKET_EVENTS.ORDER_CREATED, payload);
        }
        this.io.to(SOCKET_ROOMS.ADMIN_MONITORING).emit(SOCKET_EVENTS.ORDER_CREATED, payload);
        break;
      }

      case SOCKET_EVENTS.ORDER_STATUS_CHANGED: {
        const p = payload as { sellerId: string; buyerId?: string };
        if (p.sellerId) {
          this.io.to(SOCKET_ROOMS.sellerRoom(p.sellerId)).emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, payload);
        }
        if (p.buyerId) {
          this.io.to(SOCKET_ROOMS.buyerRoom(p.buyerId)).emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, payload);
        }
        this.io.to(SOCKET_ROOMS.ADMIN_MONITORING).emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, payload);
        break;
      }

      case SOCKET_EVENTS.DELIVERY_SLOT_CAPACITY_UPDATED: {
        const p = payload as { sellerId: string };
        if (p.sellerId) {
          this.io.to(SOCKET_ROOMS.sellerRoom(p.sellerId)).emit(SOCKET_EVENTS.DELIVERY_SLOT_CAPACITY_UPDATED, payload);
        }
        this.io.to(SOCKET_ROOMS.CATALOG_PUBLIC).emit(SOCKET_EVENTS.DELIVERY_SLOT_CAPACITY_UPDATED, payload);
        break;
      }

      case 'new_message': {
        const msg = payload as { sellerSlug?: string };
        if (msg?.sellerSlug) {
          const room = `chat:${msg.sellerSlug.toLowerCase().trim()}`;
          this.io.to(room).emit('new_message', payload);
        }
        this.io.emit('new_message', payload);
        break;
      }

      default:
        this.io.emit(type, payload);
        break;
    }
  }

  /**
   * Publishes an event across the entire HAAT platform:
   * 1. Emits locally on this service's Socket.IO server.
   * 2. Dispatches via HTTP peer webhook to sibling backends on other ports (zero-config direct delivery).
   */
  async publish(type: string, payload: any) {
    const event: PlatformBroadcastEvent = {
      type,
      payload,
      sourceService: `port-${this.currentPort}`,
      timestamp: new Date().toISOString(),
    };

    // 1. Dispatch locally immediately
    this.dispatchLocal(event);

    // 2. Multi-port Peer Broadcast (HTTP webhook direct delivery)
    for (const port of this.peerPorts) {
      void fetch(`http://127.0.0.1:${port}/api/v1/internal/realtime-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': env.INTERNAL_EVENT_SECRET,
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(1000),
      }).catch(() => {
        // Ignored: target service may be offline during isolated testing
      });
    }
  }

  async publishSellerApplicationCreated(payload: any) {
    await this.publish(SOCKET_EVENTS.APPLICATION_CREATED, payload);
  }

  async publishSellerStatusChanged(payload: SellerStatusChangedPayload) {
    await this.publish(SOCKET_EVENTS.SELLER_STATUS_CHANGED, payload);
  }

  async publishCatalogVisibilityChanged(payload: CatalogVisibilityChangedPayload) {
    await this.publish(SOCKET_EVENTS.CATALOG_VISIBILITY_CHANGED, payload);
  }

  async publishAdminSellerUpdated(payload: AdminSellerUpdatedPayload) {
    await this.publish(SOCKET_EVENTS.ADMIN_SELLER_UPDATED, payload);
  }

  async publishOrderCreated(payload: any) {
    await this.publish(SOCKET_EVENTS.ORDER_CREATED, payload);
  }

  async publishOrderStatusChanged(payload: any) {
    await this.publish(SOCKET_EVENTS.ORDER_STATUS_CHANGED, payload);
  }

  async publishDeliverySlotCapacityUpdated(payload: any) {
    await this.publish(SOCKET_EVENTS.DELIVERY_SLOT_CAPACITY_UPDATED, payload);
  }

  async publishChatMessage(payload: any) {
    await this.publish('new_message', payload);
  }
}

export const realtimeEventBus = new RealtimeEventBus();
