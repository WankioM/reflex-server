import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAnonymousCredits extends Document {
  _id: Types.ObjectId;
  ip: string;
  creditsUsed: number;
  maxCredits: number;
  lastUsedAt: Date;
  createdAt: Date;
}

const anonymousCreditsSchema = new Schema<IAnonymousCredits>(
  {
    ip: { type: String, required: true, unique: true },
    creditsUsed: { type: Number, default: 0 },
    maxCredits: { type: Number, default: 5 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL: expire after 90 days of inactivity
anonymousCreditsSchema.index({ lastUsedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AnonymousCredits = mongoose.model<IAnonymousCredits>(
  'AnonymousCredits',
  anonymousCreditsSchema
);
