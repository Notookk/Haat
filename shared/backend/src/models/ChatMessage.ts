import { Schema, model, type InferSchemaType } from 'mongoose';

const chatMessageSchema = new Schema(
  {
    sellerSlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    sellerName: { type: String, required: true, trim: true },
    buyerName: { type: String, required: true, trim: true, default: 'Customer' },
    buyerId: { type: String, trim: true, default: null },
    sender: { type: String, enum: ['BUYER', 'SELLER'], required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    productId: { type: String, trim: true, default: null },
    productTitle: { type: String, trim: true, default: null },
    productImage: { type: String, trim: true, default: null },
    productPricePaise: { type: Number, default: null },
    isRead: { type: Boolean, default: false },
    deletedForBuyer: { type: Boolean, default: false },
    deletedForSeller: { type: Boolean, default: false },
    isQuote: { type: Boolean, default: false },
    quotePricePaise: { type: Number, default: null },
    quoteQuantity: { type: Number, default: null },
    quoteTotalPricePaise: { type: Number, default: null },
    quoteNotes: { type: String, trim: true, default: null },
    quoteStatus: { type: String, enum: ['OFFERED', 'ACCEPTED', 'EXPIRED', 'ORDERED'], default: 'OFFERED' },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  },
);

chatMessageSchema.index({ sellerSlug: 1, createdAt: 1 });

export type ChatMessageAttributes = InferSchemaType<typeof chatMessageSchema>;
export const ChatMessage = model('ChatMessage', chatMessageSchema);
