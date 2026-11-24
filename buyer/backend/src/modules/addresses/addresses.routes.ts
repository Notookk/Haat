import { Router } from 'express';
import { requireAuth, validate } from '@haat/shared-backend';
import { createAddressSchema, updateAddressSchema } from '@haat/shared-contracts';
import {
  listAddressesHandler,
  createAddressHandler,
  updateAddressHandler,
  deleteAddressHandler,
  setDefaultAddressHandler,
} from './addresses.controller';

export const addressesRouter = Router();

addressesRouter.use(requireAuth);

addressesRouter.get('/', listAddressesHandler);
addressesRouter.post('/', validate(createAddressSchema), createAddressHandler);
addressesRouter.patch('/:id', validate(updateAddressSchema), updateAddressHandler);
addressesRouter.put('/:id', validate(updateAddressSchema), updateAddressHandler);
addressesRouter.delete('/:id', deleteAddressHandler);
addressesRouter.patch('/:id/default', setDefaultAddressHandler);
