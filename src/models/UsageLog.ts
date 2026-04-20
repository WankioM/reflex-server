import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUsageLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  creditsCharged: number;
  ip: string;
  userAgent: string;
  error: string | null;
  createdAt: Date;
}

const usageLogSchema = new Schema<IUsageLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true },
    responseTimeMs: { type: Number, default: 0 },
    creditsCharged: { type: Number, default: 0 },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    error: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

usageLogSchema.index({ userId: 1, createdAt: -1 });
usageLogSchema.index({ endpoint: 1, createdAt: -1 });
usageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90-day TTL

export const UsageLog = mongoose.model<IUsageLog>('UsageLog', usageLogSchema);
