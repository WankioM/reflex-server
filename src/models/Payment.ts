import mongoose, { Schema, Document, Types } from 'mongoose';
import type { PaymentStatus, PaymentType } from '../types';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  stripePaymentIntentId: string;
  stripeInvoiceId: string | null;
  type: PaymentType;
  amount: number;
  currency: string;
  creditsGranted: number;
  status: PaymentStatus;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stripePaymentIntentId: { type: String, required: true, unique: true },
    stripeInvoiceId: { type: String, default: null },
    type: { type: String, enum: ['one_time', 'subscription'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    creditsGranted: { type: Number, default: 0 },
    status: { type: String, enum: ['succeeded', 'failed', 'pending', 'refunded'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

paymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
