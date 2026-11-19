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
