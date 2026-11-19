import { Schema, model, type InferSchemaType } from 'mongoose';
import { SELLER_STATUSES, PINCODE_REGEX, GSTIN_REGEX, PAN_REGEX, IFSC_REGEX } from '@haat/shared-contracts';

const statusHistorySchema = new Schema(
  {
    previousStatus: { type: String, enum: SELLER_STATUSES, required: true },
    newStatus: { type: String, enum: SELLER_STATUSES, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    reason: { type: String, trim: true, required: true },
    notes: { type: String, trim: true, default: null },
    statusVersion: { type: Number, required: true, default: 1 },
    changedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: true, versionKey: false },
);

/**
 * Store profile, Account Approval, and payout record for a seller (PRD §14.5 #3).
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
    storeAddress: { type: String, trim: true, maxlength: 300, default: null },
    description: { type: String, trim: true, maxlength: 600, default: null },
    logoUrl: { type: String, trim: true, default: null },
    logoPublicId: { type: String, trim: true, default: null },
    bannerUrl: { type: String, trim: true, default: null },
    bannerPublicId: { type: String, trim: true, default: null },
    isOpen: { type: Boolean, default: true, required: true },
    businessPhone: { type: String, trim: true, default: null },
    businessEmail: { type: String, trim: true, default: null },

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
        validator: (values: string[]) =>
          values.length > 0 && values.length <= 200 && values.every((p) => PINCODE_REGEX.test(p)),
        message: 'Provide between 1 and 200 valid 6-digit pincodes',
      },
    },

    status: {
      type: String,
      enum: SELLER_STATUSES,
      default: 'PENDING_APPROVAL',
      required: true,
      index: true,
    },
    statusVersion: { type: Number, default: 1, min: 1, required: true },
    statusUpdatedAt: { type: Date, default: Date.now, required: true },
    statusReason: { type: String, trim: true, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvalNotes: { type: String, trim: true, default: null },
    blockedAt: { type: Date, default: null },
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    blockedReason: { type: String, trim: true, default: null },
    statusHistory: { type: [statusHistorySchema], default: [] },

    isVerified: { type: Boolean, default: false, required: true },
    isActive: { type: Boolean, default: false, required: true },

    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    onboardingCompletedAt: { type: Date, default: null },

    deliveryConfig: {
      operatingDays: {
        type: [String],
        default: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      },
      leadTimeHours: { type: Number, default: 2, min: 0 },
      dailyCutoffTime: { type: String, default: '18:00' },
      blackoutDates: { type: [String], default: [] },
      dailySlots: {
        type: [
          {
            startTime: { type: String, required: true },
            endTime: { type: String, required: true },
            capacity: { type: Number, required: true, min: 1 },
            isActive: { type: Boolean, default: true },
          },
        ],
        default: [],
      },
    },
  },
  { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } },
);

sellerProfileSchema.index({ status: 1, isVerified: 1 });
sellerProfileSchema.index({ isActive: 1, isVerified: 1 });

export type SellerProfileAttributes = InferSchemaType<typeof sellerProfileSchema>;
export const SellerProfile = model('SellerProfile', sellerProfileSchema);
