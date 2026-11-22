import { asyncHandler, sendSuccess, HttpStatus } from '@haat/shared-backend';
import { initiateCheckout } from '../services/checkout.service';

export const initiateCheckoutHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user!.id;
  const order = await initiateCheckout(buyerId, req.body);
  return sendSuccess(res, { order }, HttpStatus.CREATED);
});
