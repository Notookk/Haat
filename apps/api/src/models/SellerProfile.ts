import { Schema, model, type InferSchemaType } from 'mongoose';
import { KYC_STATUSES, PINCODE_REGEX, GSTIN_REGEX, PAN_REGEX, IFSC_REGEX } from '@haat/shared';

/**
 * Store, KYC and payout record for a seller (PRD §14.5 #3).
 * `storeSlug` and `gstin` are unique — duplicates map to HTTP 409 in the error middleware.
 */
const sellerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    storeName: { type: String, required: true, trim: true, maxlength: 80 },
    storeSlug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, trim: true, maxlength: 600, default: null },
    logoUrl: { type: String, trim: true, default: null },
    logoPublicId: { type: String, trim: true, default: null },
    bannerUrl: { type: String, trim: true, default: null },
    bannerPublicId: { type: String, trim: true, default: null },

    gstin: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: GSTIN_REGEX,
    },
    panNumber: { type: String, required: true, trim: true, uppercase: true, match: PAN_REGEX },

    bankAccountName: { type: String, required: true, trim: true, maxlength: 120 },
    bankAccountNo: { type: String, required: true, trim: true, match: /^\d{9,18}$/ },
    bankIfscCode: { type: String, required: true, trim: true, uppercase: true, match: IFSC_REGEX },

    servicePincodes: {
      type: [String],
      default: [],
      validate: {
        validator: (values: string[]) => values.length > 0 && values.length <= 200 && values.every((p) => PINCODE_REGEX.test(p)),
        message: 'Provide between 1 and 200 valid 6-digit pincodes',
      },
    },

    kycStatus: { type: String, enum: KYC_STATUSES, default: 'PENDING', required: true },
    isVerified: { type: Boolean, default: false, required: true },
    isActive: { type: Boolean, default: true, required: true },

    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    onboardingCompletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } },
);

sellerProfileSchema.index({ isActive: 1, isVerified: 1 });

export type SellerProfileAttributes = InferSchemaType<typeof sellerProfileSchema>;
export const SellerProfile = model('SellerProfile', sellerProfileSchema);
