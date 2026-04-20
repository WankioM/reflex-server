import mongoose, { Schema, Document, Types } from 'mongoose';
import type { UserRole, SubscriptionStatus, SubscriptionTier } from '../types';

export interface IUser extends Document {
  _id: Types.ObjectId;
  googleId: string;
  email: string;
  displayName: string;
  avatar: string;
  role: UserRole;
  credits: number;
  freeCreditsGranted: boolean;
  onboarding: {
    completedAt: Date | null;
    steps: string[];
  };
  byoKey: {
    encryptedKey: string | null;
    iv: string | null;
    enabled: boolean;
  };
  connections: {
    github: {
      accessToken: string | null;
      username: string | null;
      connectedAt: Date | null;
    };
  };
  subscription: {
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  };
  rateLimits: {
    assistantCallsPerMin: number | null;
    apiCallsPerMin: number | null;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const userSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['free', 'pro', 'team', 'admin'], default: 'free' },
    credits: { type: Number, default: 0 },
    freeCreditsGranted: { type: Boolean, default: false },
    onboarding: {
      completedAt: { type: Date, default: null },
      steps: { type: [String], default: [] },
    },
    byoKey: {
      encryptedKey: { type: String, default: null },
      iv: { type: String, default: null },
      enabled: { type: Boolean, default: false },
    },
    connections: {
      github: {
        accessToken: { type: String, default: null },
        username: { type: String, default: null },
        connectedAt: { type: Date, default: null },
      },
    },
    subscription: {
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      tier: { type: String, enum: ['free', 'pro'], default: 'free' },
      status: { type: String, enum: ['active', 'canceled', 'past_due', 'none'], default: 'none' },
      currentPeriodEnd: { type: Date, default: null },
    },
    rateLimits: {
      assistantCallsPerMin: { type: Number, default: null },
      apiCallsPerMin: { type: Number, default: null },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ 'subscription.stripeCustomerId': 1 });

export const User = mongoose.model<IUser>('User', userSchema);
