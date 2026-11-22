import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createSocketClient } from '@haat/shared-frontend';
import { SOCKET_EVENTS, type CatalogVisibilityChangedPayload } from '@haat/shared-contracts';

export function useCatalogRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = createSocketClient();

    socket.on(SOCKET_EVENTS.CATALOG_VISIBILITY_CHANGED, (_payload: CatalogVisibilityChangedPayload) => {
      // Invalidate all catalog queries so blocked seller's products are immediately dropped
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['storefront'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
