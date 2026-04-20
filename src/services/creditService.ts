import mongoose from 'mongoose';
import { User } from '../models/User';
import { CreditTransaction } from '../models/CreditTransaction';
import { Errors } from '../errors/errorCodes';
import type { CreditTransactionType } from '../types';

interface CreditOperation {
  userId: string;
  amount: number;
  type: CreditTransactionType;
  description: string;
  metadata?: {
    conversationId?: string;
    giftedBy?: string;
    stripePaymentId?: string;
  };
}

// Deduct credits atomically — returns new balance or throws
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  conversationId?: string
): Promise<number> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findOneAndUpdate(
      { _id: userId, credits: { $gte: amount }, deletedAt: null },
      { $inc: { credits: -amount } },
      { new: true, session }
    );

    if (!user) {
      // Check if user exists but has insufficient credits
      const existingUser = await User.findById(userId).session(session);
      if (existingUser) {
        throw Errors.CREDITS_INSUFFICIENT(amount, existingUser.credits);
      }
      throw Errors.NOT_FOUND('User');
    }

    await CreditTransaction.create(
      [
        {
          userId: user._id,
          type: 'deduction',
          amount: -amount,
          balance: user.credits,
          description,
          metadata: { conversationId },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return user.credits;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Add credits (purchase, gift, signup bonus, refund)
export async function addCredits(op: CreditOperation): Promise<number> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findOneAndUpdate(
      { _id: op.userId, deletedAt: null },
      { $inc: { credits: op.amount } },
      { new: true, session }
    );

    if (!user) {
      throw Errors.NOT_FOUND('User');
    }

    await CreditTransaction.create(
      [
        {
          userId: user._id,
          type: op.type,
          amount: op.amount,
          balance: user.credits,
          description: op.description,
          metadata: {
            ...(op.metadata?.giftedBy && {
              giftedBy: new mongoose.Types.ObjectId(op.metadata.giftedBy),
            }),
            ...(op.metadata?.stripePaymentId && {
              stripePaymentId: op.metadata.stripePaymentId,
            }),
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return user.credits;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Grant signup bonus — idempotent (only grants once)
export async function grantSignupBonus(userId: string, amount: number): Promise<number | null> {
  const user = await User.findById(userId);
  if (!user || user.freeCreditsGranted) return null;

  await User.updateOne({ _id: userId }, { freeCreditsGranted: true });

  return addCredits({
    userId,
    amount,
    type: 'signup_bonus',
    description: `Welcome bonus — ${amount} free credits`,
  });
}

// Get credit balance
export async function getBalance(userId: string): Promise<number> {
  const user = await User.findById(userId).select('credits');
  if (!user) throw Errors.NOT_FOUND('User');
  return user.credits;
}

// Get transaction history (paginated)
export async function getTransactionHistory(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    CreditTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CreditTransaction.countDocuments({ userId }),
  ]);

  return {
    data: transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
