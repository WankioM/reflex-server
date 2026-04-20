import type { Types } from 'mongoose';

// Roles
export type UserRole = 'free' | 'pro' | 'team' | 'admin';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'none';
export type SubscriptionTier = 'free' | 'pro';
export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type MessageRole = 'user' | 'assistant';
export type CreditTransactionType = 'signup_bonus' | 'purchase' | 'gift' | 'deduction' | 'refund';
export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'refunded';
export type PaymentType = 'one_time' | 'subscription';

// JWT payload
export interface JwtPayload {
  userId: string;
  role: UserRole;
}

// Augment Express Request globally
declare global {
  namespace Express {
    interface Request {
      authUser?: {
        userId: string;
        role: UserRole;
      };
    }
  }
}

// Structured error response
export interface ErrorResponse {
  error: string;
  code: string;
  action?: string;
}

// Pagination
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
