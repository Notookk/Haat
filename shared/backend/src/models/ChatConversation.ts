import { Schema, model, type InferSchemaType } from 'mongoose';

const chatConversationSchema = new Schema(
  {
    sellerSlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    sellerName: { type: String, required: true, trim: true },
    buyerId: { type: String, trim: true, default: null, index: true },
    buyerName: { type: String, required: true, trim: true },
    isBlocked: { type: Boolean, default: false },
    blockedBy: { type: String, enum: ['BUYER', 'SELLER', null], default: null },
    blockedReason: { type: String, default: null },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  },
);

// Indexes for conversation querying
chatConversationSchema.index({ sellerSlug: 1, buyerId: 1 });
chatConversationSchema.index({ sellerSlug: 1, buyerName: 1 });
chatConversationSchema.index({ lastMessageAt: -1 });

export type ChatConversationAttributes = InferSchemaType<typeof chatConversationSchema>;
export const ChatConversation = model('ChatConversation', chatConversationSchema);
