import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';
import { User } from '../models/User';

export const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  signature: string;
  uploadUrl: string;
  allowedFormats: readonly string[];
  maxFileSizeBytes: number;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export interface CreateUploadSignatureOptions {
  productId?: string;
  folder?: string;
  imageName?: string;
}

/**
 * Cloudinary signed direct upload.
 * If `productId` is provided, uploads to `Haat/<productId>` with asset named `<sequenceNumber>` (001, 002, ...).
 * Otherwise, uploads to folder `Haat` with asset named `<userId>_<sequenceNumber>`.
 * No upload preset is used; signature is securely signed with API secret.
 */
export async function createUploadSignature(
  userId: string,
  options?: CreateUploadSignatureOptions,
): Promise<UploadSignature> {
  if (!isCloudinaryConfigured()) {
    throw AppError.unavailable('Image uploads are not configured on this environment yet.');
  }

  // Atomically get next upload sequence number for this user
  let sequenceNumber = 1;
  if (mongoose.connection.readyState === 1) {
    try {
      const updated = await User.findByIdAndUpdate(
        userId,
        { $inc: { uploadCounter: 1 } },
        { new: true, select: 'uploadCounter' },
      );
      if (updated?.uploadCounter) {
        sequenceNumber = updated.uploadCounter;
      }
    } catch {
      sequenceNumber = 1;
    }
  }

  const sequenceStr = String(sequenceNumber).padStart(3, '0');
  const baseFolder = env.CLOUDINARY_UPLOAD_FOLDER || 'Haat';
  const folder = options?.productId ? `${baseFolder}/${options.productId}` : options?.folder || baseFolder;
  const publicId = options?.productId
    ? (options.imageName || sequenceStr)
    : (options?.imageName || `${userId}_${sequenceStr}`);
  const timestamp = Math.floor(Date.now() / 1000);

  const params: Record<string, string | number> = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const signature = createHash('sha1').update(`${toSign}${env.CLOUDINARY_API_SECRET}`).digest('hex');

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME as string,
    apiKey: env.CLOUDINARY_API_KEY as string,
    timestamp,
    folder,
    publicId,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    allowedFormats: ALLOWED_IMAGE_FORMATS,
    maxFileSizeBytes: MAX_IMAGE_BYTES,
  };
}

/**
 * Extract Cloudinary public ID from a URL or raw public ID string.
 */
export function extractCloudinaryPublicId(urlOrPublicId?: string | null): string | null {
  if (!urlOrPublicId || typeof urlOrPublicId !== 'string') return null;
  const trimmed = urlOrPublicId.trim();
  if (!trimmed) return null;

  // If already a public ID (e.g. "Haat/user123_001" or "001"), return it
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Parse from Cloudinary URL:
  // e.g. https://res.cloudinary.com/<cloud>/image/upload/(v<ver>/)?<public_id>.<ext>
  const match = trimmed.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Permanently delete image assets from Cloudinary using their public IDs or URLs.
 */
export async function deleteCloudinaryImages(publicIdsOrUrls: string[]): Promise<void> {
  const validIds = publicIdsOrUrls
    .map((id) => extractCloudinaryPublicId(id) || (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id.length > 0);
  if (!isCloudinaryConfigured() || validIds.length === 0) return;

  try {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    await Promise.allSettled(
      validIds.map(async (publicId) => {
        try {
          return await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error(`Error deleting Cloudinary asset ${publicId}:`, err);
        }
      }),
    );
  } catch (error) {
    console.error('Failed to delete Cloudinary images:', error);
  }
}

/**
 * Permanently delete a category's image from Cloudinary using publicId or URL.
 */
export async function deleteCloudinaryCategoryImage(
  imagePublicId?: string | null,
  imageUrl?: string | null,
): Promise<void> {
  const publicId = imagePublicId || extractCloudinaryPublicId(imageUrl);
  if (!publicId) return;
  await deleteCloudinaryImages([publicId]);
}

/**
 * Permanently delete an entire product folder from Cloudinary.
 */
export async function deleteCloudinaryProductFolder(productId: string): Promise<void> {
  if (!isCloudinaryConfigured() || !productId) return;
  try {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const folder = `Haat/${productId}`;
    try {
      await cloudinary.api.delete_resources_by_prefix(folder);
    } catch {
      // folder might have no resources
    }
    try {
      await cloudinary.api.delete_folder(folder);
    } catch {
      // folder might not exist or might not be empty
    }
  } catch (error) {
    console.error(`Failed to delete Cloudinary folder Haat/${productId}:`, error);
  }
}
