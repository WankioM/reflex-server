import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  keyHash: string;
  name: string;
  permissions: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    keyHash: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    permissions: { type: [String], default: [] },
    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

apiKeySchema.index({ userId: 1 });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', apiKeySchema);
