import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Append-only admin action trail (PRD §14.5 #17).
 * The absence of update/delete is the feature — query middleware rejects both at the model layer.
 */
const auditLogSchema = new Schema(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    entityType: { type: String, required: true, trim: true, maxlength: 60 },
    entityId: { type: String, required: true, trim: true, maxlength: 64 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, trim: true, maxlength: 64, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { versionKey: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });

const APPEND_ONLY_MESSAGE = 'auditlogs is append-only: updates and deletes are rejected at the model layer.';

auditLogSchema.pre('updateOne', function rejectUpdate(next) {
  next(new Error(APPEND_ONLY_MESSAGE));
});
auditLogSchema.pre('updateMany', function rejectUpdateMany(next) {
  next(new Error(APPEND_ONLY_MESSAGE));
});
auditLogSchema.pre('findOneAndUpdate', function rejectFindOneAndUpdate(next) {
  next(new Error(APPEND_ONLY_MESSAGE));
});
auditLogSchema.pre('deleteOne', function rejectDelete(next) {
  next(new Error(APPEND_ONLY_MESSAGE));
});
auditLogSchema.pre('deleteMany', function rejectDeleteMany(next) {
  next(new Error(APPEND_ONLY_MESSAGE));
});
auditLogSchema.pre('findOneAndDelete', function rejectFindOneAndDelete(next) {
  next(new Error(APPEND_ONLY_MESSAGE));
});

export type AuditLogAttributes = InferSchemaType<typeof auditLogSchema>;
export const AuditLog = model('AuditLog', auditLogSchema);
