import { Router, type Request, type Response } from 'express';
import { env } from '../config/env';
import { realtimeEventBus } from './eventBus';
import type { PlatformBroadcastEvent } from './types';

export const internalRealtimeRouter = Router();

internalRealtimeRouter.post('/internal/realtime-event', (req: Request, res: Response) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== env.INTERNAL_EVENT_SECRET) {
    res.status(401).json({ success: false, message: 'Unauthorized internal dispatch' });
    return;
  }

  const event = req.body as PlatformBroadcastEvent;
  if (!event || !event.type) {
    res.status(400).json({ success: false, message: 'Invalid event payload' });
    return;
  }

  realtimeEventBus.dispatchLocal(event);
  res.json({ success: true, received: true });
});
