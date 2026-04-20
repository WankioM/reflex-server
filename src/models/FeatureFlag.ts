import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFeatureFlag extends Document {
  _id: Types.ObjectId;
  key: string;
  enabled: boolean;
  description: string;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
}

const featureFlagSchema = new Schema<IFeatureFlag>(
  {
    key: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    description: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const FeatureFlag = mongoose.model<IFeatureFlag>('FeatureFlag', featureFlagSchema);
