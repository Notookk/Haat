import { createHash } from 'node:crypto';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';

export const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
  uploadPreset: string | null;
  allowedFormats: readonly string[];
  maxFileSizeBytes: number;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

/**
 * Cloudinary signed *direct* upload (PRD §14.5 / TSK-P3-03).
 * The API secret never leaves the server; the browser posts the file straight to Cloudinary.
 * Signature = sha1(sorted signed params joined `k=v&…` + api_secret).
 */
export function createUploadSignature(userId: string): UploadSignature {
  if (!isCloudinaryConfigured()) {
    throw AppError.unavailable('Image uploads are not configured on this environment yet.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `${env.CLOUDINARY_UPLOAD_FOLDER}/sellers/${userId}`;

  const params: Record<string, string | number> = { folder, timestamp };
  if (env.CLOUDINARY_UPLOAD_PRESET) params.upload_preset = env.CLOUDINARY_UPLOAD_PRESET;

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
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    uploadPreset: env.CLOUDINARY_UPLOAD_PRESET ?? null,
    allowedFormats: ALLOWED_IMAGE_FORMATS,
    maxFileSizeBytes: MAX_IMAGE_BYTES,
  };
}
