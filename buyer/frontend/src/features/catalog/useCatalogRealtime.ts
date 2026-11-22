import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createSocketClient } from '@haat/shared-frontend';
import {
  SOCKET_EVENTS,
  type CatalogVisibilityChangedPayload,
  type ProductChangedPayload,
  type CategoryChangedPayload,
  type StoreUpdatedPayload,
} from '@haat/shared-contracts';

export function useCatalogRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = createSocketClient();

    const invalidateCatalogAndProducts = () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['product'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.refetchQueries({ queryKey: ['categories'] });
      void queryClient.refetchQueries({ queryKey: ['products'] });
    };

    const invalidateCategories = () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.refetchQueries({ queryKey: ['categories'] });
    };

    const invalidateStore = () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    };

    const invalidateDeliverySlots = () => {
      void queryClient.invalidateQueries({ queryKey: ['delivery-slots'] });
    };

    // Immediate sync on initial socket connection or reconnection
    socket.on('connect', () => {
      invalidateCatalogAndProducts();
    });

    // Product events from sellers / admin
    socket.on(SOCKET_EVENTS.PRODUCT_CREATED, (_payload: ProductChangedPayload) => {
      invalidateCatalogAndProducts();
    });

    socket.on(SOCKET_EVENTS.PRODUCT_UPDATED, (_payload: ProductChangedPayload) => {
      invalidateCatalogAndProducts();
    });

    socket.on(SOCKET_EVENTS.PRODUCT_DELETED, (_payload: ProductChangedPayload) => {
      invalidateCatalogAndProducts();
    });

    // Category taxonomy events from sellers / admin
    socket.on(SOCKET_EVENTS.CATEGORY_CREATED, (_payload: CategoryChangedPayload) => {
      invalidateCategories();
    });

    socket.on(SOCKET_EVENTS.CATEGORY_UPDATED, (_payload: CategoryChangedPayload) => {
      invalidateCategories();
    });

    socket.on(SOCKET_EVENTS.CATEGORY_DELETED, (_payload: CategoryChangedPayload) => {
      invalidateCategories();
    });

    // Store profile updates
    socket.on(SOCKET_EVENTS.STORE_UPDATED, (_payload: StoreUpdatedPayload) => {
      invalidateStore();
    });

    // Delivery slots capacity updates
    socket.on(SOCKET_EVENTS.DELIVERY_SLOT_CAPACITY_UPDATED, () => {
      invalidateDeliverySlots();
    });

    // Seller account state changes (blocked / unblocked)
    socket.on(SOCKET_EVENTS.CATALOG_VISIBILITY_CHANGED, (_payload: CatalogVisibilityChangedPayload) => {
      invalidateCatalogAndProducts();
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
