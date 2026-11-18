import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { sellerRouter } from '../modules/sellers/seller.routes';
import { catalogRouter } from '../modules/catalog/catalog.routes';
import { uploadRouter } from '../modules/uploads/upload.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.status(200).json({ success: true, status: 'ok', service: 'haat-api' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/sellers', sellerRouter);
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/', catalogRouter);
