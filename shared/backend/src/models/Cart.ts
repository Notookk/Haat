import { Schema, model, type InferSchemaType } from 'mongoose';

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, default: null },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false, versionKey: false },
);

const cartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true, versionKey: false, autoCreate: false, autoIndex: false },
);

export type CartAttributes = InferSchemaType<typeof cartSchema>;
export const Cart = model('Cart', cartSchema);
