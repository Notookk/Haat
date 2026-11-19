import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Persisted registry of revoked JWT access tokens (blacklisted on logout).
 * Automatically cleaned up by MongoDB after the token's natural expiration via TTL index.
 */
const revokedTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  },
);

export type RevokedTokenAttributes = InferSchemaType<typeof revokedTokenSchema>;
export const RevokedToken = model('RevokedToken', revokedTokenSchema);
export type RevokedTokenDocument = ReturnType<(typeof RevokedToken)['hydrate']>;
