import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Self-referencing category tree (PRD §14.5 #5).
 * `path` is materialized (`industrial/hardware/fasteners`) so a subtree query is one indexed prefix scan.
 */
const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, trim: true, maxlength: 400, default: null },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    /** Materialized path, e.g. `industrial/hardware`. Root categories have `path === slug`. */
    path: { type: String, required: true, trim: true },
    depth: { type: Number, required: true, default: 0, min: 0, max: 3 },
    displayOrder: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, required: true },
    productCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } },
);

categorySchema.index({ parentId: 1, displayOrder: 1 });
categorySchema.index({ path: 1 });

export type CategoryAttributes = InferSchemaType<typeof categorySchema>;
export const Category = model('Category', categorySchema);
