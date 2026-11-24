import type { Request, Response } from 'express';
import { asyncHandler, sendSuccess, HttpStatus } from '@haat/shared-backend';
import {
  listUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
} from './addresses.service';

export const listAddressesHandler = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await listUserAddresses(req.user!.id);
  return sendSuccess(res, { addresses });
});

export const createAddressHandler = asyncHandler(async (req: Request, res: Response) => {
  const address = await createUserAddress(req.user!.id, req.body);
  return sendSuccess(res, { address }, HttpStatus.CREATED);
});

export const updateAddressHandler = asyncHandler(async (req: Request, res: Response) => {
  const address = await updateUserAddress(req.user!.id, req.params.id, req.body);
  return sendSuccess(res, { address });
});

export const deleteAddressHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteUserAddress(req.user!.id, req.params.id);
  return sendSuccess(res, result);
});

export const setDefaultAddressHandler = asyncHandler(async (req: Request, res: Response) => {
  const address = await setDefaultUserAddress(req.user!.id, req.params.id);
  return sendSuccess(res, { address });
});
