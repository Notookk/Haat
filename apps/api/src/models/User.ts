import { Schema, model, type InferSchemaType } from 'mongoose';
import { USER_ROLES } from '@haat/shared';

/**
 * Identity root for every role (PRD §14.5 #1).
 * `passwordHash` is `select: false` — it must be explicitly requested by the auth service.
 */
const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'BUYER', required: true },
    isActive: { type: Boolean, default: true, required: true },
    /** Bumped on password change to invalidate outstanding refresh sessions. */
    tokenVersion: { type: Number, default: 0, min: 0 },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    /**
     * No custom `toJSON.transform` here: combining `virtuals` with a typed transform makes
     * Mongoose fall back to `unknown` for every inferred field. Responses are shaped by DTOs,
     * and `passwordHash` is already `select: false`.
     */
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  },
);

userSchema.index({ role: 1, isActive: 1 });

export type UserAttributes = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
export type UserDocument = ReturnType<(typeof User)['hydrate']>;
