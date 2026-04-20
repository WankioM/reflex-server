import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ConversationStatus } from '../types';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  status: ConversationStatus;
  messageCount: number;
  totalTokensUsed: number;
  totalCreditsCharged: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New conversation' },
    status: { type: String, enum: ['active', 'archived', 'deleted'], default: 'active' },
    messageCount: { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 },
    totalCreditsCharged: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, lastMessageAt: -1 });
conversationSchema.index({ userId: 1, status: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
