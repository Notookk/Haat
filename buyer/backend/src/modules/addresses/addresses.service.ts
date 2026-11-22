import { Types } from 'mongoose';
import { Address, AppError } from '@haat/shared-backend';
import type { CreateAddressInput, UpdateAddressInput } from '@haat/shared-contracts';

export async function listUserAddresses(userId: string) {
  // Chronological FIFO creation order (first came at top, then next below)
  const addresses = await Address.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  return addresses;
}

export async function createUserAddress(userId: string, data: CreateAddressInput) {
  const userObjectId = new Types.ObjectId(userId);
  const count = await Address.countDocuments({ userId: userObjectId });

  // If this is the user's first address or isDefault is true, set as default
  const isDefault = data.isDefault || count === 0;

  if (isDefault) {
    await Address.updateMany({ userId: userObjectId }, { $set: { isDefault: false } });
  }

  const created = await Address.create({
    userId: userObjectId,
    label: data.label || 'Home',
    recipientName: data.recipientName.trim(),
    phoneNumber: data.phoneNumber.trim(),
    line1: data.line1.trim(),
    line2: data.line2 ? data.line2.trim() : undefined,
    landmark: data.landmark ? data.landmark.trim() : undefined,
    city: data.city.trim(),
    state: data.state.trim(),
    pincode: data.pincode.trim(),
    isDefault,
  });

  return created.toObject();
}

export async function updateUserAddress(userId: string, addressId: string, data: UpdateAddressInput) {
  const userObjectId = new Types.ObjectId(userId);
  const address = await Address.findOne({ _id: new Types.ObjectId(addressId), userId: userObjectId });

  if (!address) {
    throw AppError.notFound('Address not found or does not belong to your account');
  }

  if (data.isDefault) {
    await Address.updateMany({ userId: userObjectId }, { $set: { isDefault: false } });
  }

  if (data.label !== undefined) address.label = data.label.trim();
  if (data.recipientName !== undefined) address.recipientName = data.recipientName.trim();
  if (data.phoneNumber !== undefined) address.phoneNumber = data.phoneNumber.trim();
  if (data.line1 !== undefined) address.line1 = data.line1.trim();
  if (data.line2 !== undefined) address.line2 = data.line2 ? data.line2.trim() : (undefined as any);
  if (data.landmark !== undefined) address.landmark = data.landmark ? data.landmark.trim() : (undefined as any);
  if (data.city !== undefined) address.city = data.city.trim();
  if (data.state !== undefined) address.state = data.state.trim();
  if (data.pincode !== undefined) address.pincode = data.pincode.trim();
  if (data.isDefault !== undefined) address.isDefault = Boolean(data.isDefault);

  await address.save();
  return address.toObject();
}

export async function deleteUserAddress(userId: string, addressId: string) {
  const userObjectId = new Types.ObjectId(userId);
  const address = await Address.findOneAndDelete({ _id: new Types.ObjectId(addressId), userId: userObjectId });

  if (!address) {
    throw AppError.notFound('Address not found or does not belong to your account');
  }

  // If the deleted address was default, promote the earliest created address to default
  if (address.isDefault) {
    const nextDefault = await Address.findOne({ userId: userObjectId }).sort({ createdAt: 1, _id: 1 });
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
    }
  }

  return { success: true, deletedId: addressId };
}

export async function setDefaultUserAddress(userId: string, addressId: string) {
  const userObjectId = new Types.ObjectId(userId);
  const address = await Address.findOne({ _id: new Types.ObjectId(addressId), userId: userObjectId });

  if (!address) {
    throw AppError.notFound('Address not found or does not belong to your account');
  }

  await Address.updateMany({ userId: userObjectId }, { $set: { isDefault: false } });
  address.isDefault = true;
  await address.save();

  return address.toObject();
}
