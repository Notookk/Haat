import { io, type Socket } from 'socket.io-client';

export interface CreateSocketClientOptions {
  url?: string;
  token?: string | null;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onReconnect?: () => void;
  onError?: (error: Error) => void;
}

export function createSocketClient(options?: CreateSocketClientOptions): Socket {
  // If in browser and URL not specified, use current window origin or sensible local fallback
  const url = options?.url || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
  const token = options?.token;

  const socket: Socket = io(url, {
    auth: token ? { token } : undefined,
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  if (options?.onConnect) socket.on('connect', options.onConnect);
  if (options?.onDisconnect) socket.on('disconnect', options.onDisconnect);
  if (options?.onReconnect) socket.io.on('reconnect', options.onReconnect);
  if (options?.onError) socket.on('connect_error', options.onError);

  return socket;
}
