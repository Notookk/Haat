import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Product aggregate (PRD §14.5 #6).
 * Variants, images and pricing tiers are embedded because stock decrement and tier
 * resolution must be atomic on a single document (§14.8.2).
 */

const variantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 64 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    priceModifierPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: { validator: Number.isSafeInteger, message: 'priceModifierPaise must be an integer number of paise' },
    },
    stockQuantity: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    /** Free-form attribute map, e.g. { size: 'M', colour: 'Navy' }. */
    attributes: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: true, versionKey: false },
);

const imageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true, default: null },
    altText: { type: String, trim: true, maxlength: 160, default: null },
    displayOrder: { type: Number, default: 0, min: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true, versionKey: false },
);

const pricingTierSchema = new Schema(
  {
    minQuantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    /** `null` means open-ended; only the last tier may be open-ended. */
    maxQuantity: { type: Number, default: null, validate: { validator: (v: number | null) => v === null || Number.isInteger(v) } },
    unitPricePaise: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isSafeInteger, message: 'unitPricePaise must be an integer number of paise' },
    },
  },
  { _id: false, versionKey: false },
);

const productSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true },
    /** Denormalized for search cards — never re-joined on list surfaces. */
    sellerName: { type: String, required: true, trim: true, maxlength: 80 },
    sellerSlug: { type: String, required: true, trim: true, lowercase: true },

    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    /** Denormalized ancestor path so a subtree filter is a prefix match. */
    categoryPath: { type: String, required: true, trim: true },

    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 64 },
    brand: { type: String, trim: true, maxlength: 80, default: null },

    retailPricePaise: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isSafeInteger, message: 'retailPricePaise must be an integer number of paise' },
    },
    moq: { type: Number, default: 1, min: 1, validate: Number.isInteger },
    orderMultiple: { type: Number, default: 1, min: 1, validate: Number.isInteger },
    isWholesaleActive: { type: Boolean, default: false },

    variants: { type: [variantSchema], default: [] },
    images: { type: [imageSchema], default: [] },
    pricingTiers: { type: [pricingTierSchema], default: [] },

    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },

    isActive: { type: Boolean, default: true, required: true },
    isApproved: { type: Boolean, default: true, required: true },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  },
);

productSchema.index({ sellerId: 1, isActive: 1 });
productSchema.index({ categoryId: 1, isActive: 1, retailPricePaise: 1 });
productSchema.index({ categoryPath: 1, isActive: 1 });
productSchema.index({ 'variants.sku': 1 }, { unique: true });
productSchema.index(
  { title: 'text', description: 'text', brand: 'text', sku: 'text' },
  { weights: { title: 10, sku: 8, brand: 4, description: 2 }, name: 'product_search' },
);

export type ProductAttributes = InferSchemaType<typeof productSchema>;
export const Product = model('Product', productSchema);
