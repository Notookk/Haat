import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Rotating refresh sessions (PRD §14.5 #18).
 * Only a SHA-256 hash of the token is stored; the raw value lives solely in the HttpOnly cookie.
 * `expiresAt` carries a TTL index, so expired sessions are reaped by MongoDB.
 */
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    /** Hash of the token that superseded this one — used to detect replay. */
    replacedByHash: { type: String, default: null },
    userAgent: { type: String, maxlength: 300, default: null },
    ipAddress: { type: String, maxlength: 64, default: null },
  },
  { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1, createdAt: -1 });

export type RefreshTokenAttributes = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshToken = model('RefreshToken', refreshTokenSchema);
