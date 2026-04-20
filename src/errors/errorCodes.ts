import { AppError } from './AppError';

export const Errors = {
  // Auth
  AUTH_EXPIRED: () =>
    new AppError('Your session expired. Sign in again.', 401, 'AUTH_EXPIRED', 'Redirect to login'),
  AUTH_INVALID: () =>
    new AppError('Invalid or missing authentication token.', 401, 'AUTH_INVALID'),
  AUTH_FORBIDDEN: () =>
    new AppError('You do not have permission to access this resource.', 403, 'AUTH_FORBIDDEN'),

  // Anonymous credits
  ANONYMOUS_CREDITS_EXHAUSTED: (maxCredits: number, signupCredits: number) =>
    new AppError(
      `You've used all ${maxCredits} free queries. Sign up for ${signupCredits} more free credits.`,
      402,
      'ANONYMOUS_CREDITS_EXHAUSTED',
      'Show signup prompt'
    ),

  // Credits
  CREDITS_EXHAUSTED: () =>
    new AppError(
      "You're out of credits. Buy more or add your own Claude API key.",
      402,
      'CREDITS_EXHAUSTED',
      'Show credits purchase modal or BYO key settings'
    ),
  CREDITS_INSUFFICIENT: (required: number, available: number) =>
    new AppError(
      `This action requires ${required} credits but you only have ${available}.`,
      402,
      'CREDITS_INSUFFICIENT'
    ),

  // BYO Key
  BYO_KEY_INVALID: () =>
    new AppError(
      "Your Claude API key isn't working. Check it at console.anthropic.com.",
      400,
      'BYO_KEY_INVALID',
      'Open BYO key settings'
    ),
  BYO_KEY_QUOTA: () =>
    new AppError(
      'Your Claude API key is out of tokens. Top up at anthropic.com or switch to Reflex credits.',
      402,
      'BYO_KEY_QUOTA',
      'Show toggle to switch to Reflex credits'
    ),

  // Rate Limiting
  RATE_LIMITED: () =>
    new AppError('Slow down — try again in a few seconds.', 429, 'RATE_LIMITED'),

  // Connections
  GITHUB_DISCONNECTED: () =>
    new AppError('Reconnect your GitHub account to use this feature.', 400, 'GITHUB_DISCONNECTED', 'Open connections settings'),

  // General
  NOT_FOUND: (resource: string) =>
    new AppError(`${resource} not found.`, 404, 'NOT_FOUND'),
  VALIDATION_ERROR: (details: string) =>
    new AppError(details, 400, 'VALIDATION_ERROR'),
  SERVICE_UNAVAILABLE: () =>
    new AppError("The assistant is temporarily down. We're on it.", 503, 'SERVICE_UNAVAILABLE'),
  INTERNAL_ERROR: () =>
    new AppError('Something went wrong. Please try again later.', 500, 'INTERNAL_ERROR'),
};
