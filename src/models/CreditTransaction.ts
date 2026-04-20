import mongoose, { Schema, Document, Types } from 'mongoose';
import type { CreditTransactionType } from '../types';

export interface ICreditTransaction extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: CreditTransactionType;
  amount: number;
  balance: number;
  description: string;
  metadata: {
    conversationId?: Types.ObjectId;
    giftedBy?: Types.ObjectId;
    stripePaymentId?: string;
  };
  createdAt: Date;
}

const creditTransactionSchema = new Schema<ICreditTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['signup_bonus', 'purchase', 'gift', 'deduction', 'refund'],
      required: true,
    },
    amount: { type: Number, required: true },
    balance: { type: Number, required: true },
    description: { type: String, required: true },
    metadata: {
      conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
      giftedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      stripePaymentId: { type: String },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

creditTransactionSchema.index({ userId: 1, createdAt: -1 });
creditTransactionSchema.index({ type: 1 });

export const CreditTransaction = mongoose.model<ICreditTransaction>(
  'CreditTransaction',
  creditTransactionSchema
);
