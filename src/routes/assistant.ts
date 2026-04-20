import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth';
import { assistantLimiter } from '../middleware/rateLimiter';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { AnonymousCredits } from '../models/AnonymousCredits';
import { deductCredits } from '../services/creditService';
import { getByoKey } from '../services/encryptionService';
import { Errors } from '../errors/errorCodes';
import { env } from '../config/env';

const router = Router();

// POST /api/assistant/chat — works for both anonymous and authenticated users
router.post('/chat', optionalAuth, assistantLimiter, async (req: Request, res: Response) => {
  const { conversationId, message } = req.body;

  if (!message || typeof message !== 'string') {
    const err = Errors.VALIDATION_ERROR('message is required.');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  // ── Anonymous user (no account) ──
  if (!req.authUser) {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';

    const record = await AnonymousCredits.findOneAndUpdate(
      { ip },
      { $setOnInsert: { ip, creditsUsed: 0, maxCredits: env.anonymousCreditsPerIp } },
      { upsert: true, new: true }
    );

    if (record.creditsUsed >= record.maxCredits) {
      res.status(402).json({
        error: `You've used all ${record.maxCredits} free queries. Sign up for ${env.freeSignupCredits} more free credits.`,
        code: 'ANONYMOUS_CREDITS_EXHAUSTED',
        action: 'Show signup prompt',
      });
      return;
    }

    // TODO: Call the RAG assistant here
    const assistantResponse = '[Assistant response placeholder — wire up RAG pipeline here]';

    // Deduct anonymous credit
    await AnonymousCredits.updateOne(
      { ip },
      { $inc: { creditsUsed: 1 }, lastUsedAt: new Date() }
    );

    res.json({
      data: {
        message: { role: 'assistant', content: assistantResponse },
        creditsRemaining: record.maxCredits - record.creditsUsed - 1,
        isAnonymous: true,
      },
    });
    return;
  }

  // ── Authenticated user ──
  const user = await User.findById(req.authUser.userId).lean();
  if (!user || user.deletedAt) {
    const err = Errors.NOT_FOUND('User');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  // Determine if using BYO key or Reflex credits
  let byoApiKey: string | null = null;

  if (user.byoKey.enabled) {
    byoApiKey = await getByoKey(req.authUser.userId);
    if (!byoApiKey) {
      const err = Errors.BYO_KEY_INVALID();
      res.status(err.statusCode).json({ error: err.message, code: err.code, action: err.action });
      return;
    }
  } else {
    if (user.credits < env.creditsPerAssistantCall) {
      const err = Errors.CREDITS_EXHAUSTED();
      res.status(err.statusCode).json({ error: err.message, code: err.code, action: err.action });
      return;
    }
  }

  // Get or create conversation
  let conversation;
  if (conversationId) {
    conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.authUser.userId,
      status: 'active',
    });
    if (!conversation) {
      const err = Errors.NOT_FOUND('Conversation');
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
  } else {
    conversation = await Conversation.create({
      userId: req.authUser.userId,
      title: message.slice(0, 100),
    });
  }

  // Store user message
  await Message.create({
    conversationId: conversation._id,
    userId: req.authUser.userId,
    role: 'user',
    content: message,
  });

  // Load conversation history for context
  const history = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // TODO: Call the RAG assistant here with history context
  // If byoApiKey is set, use it directly with Anthropic
  // If not, use the platform's API key and deduct credits
  const assistantResponse = '[Assistant response placeholder — wire up RAG pipeline here]';
  const tokensUsed = 0;

  // Deduct credits if not using BYO key
  if (!byoApiKey) {
    await deductCredits(
      req.authUser.userId,
      env.creditsPerAssistantCall,
      `Chat — ${message.slice(0, 50)}`,
      conversation._id.toString()
    );
  }

  // Store assistant response
  const assistantMessage = await Message.create({
    conversationId: conversation._id,
    userId: req.authUser.userId,
    role: 'assistant',
    content: assistantResponse,
    tokensUsed,
    creditsCharged: byoApiKey ? 0 : env.creditsPerAssistantCall,
    codeCheckerRan: false,
  });

  // Update conversation metadata
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $inc: {
        messageCount: 2,
        totalTokensUsed: tokensUsed,
        totalCreditsCharged: byoApiKey ? 0 : env.creditsPerAssistantCall,
      },
      lastMessageAt: new Date(),
    }
  );

  res.json({
    data: {
      conversationId: conversation._id,
      message: assistantMessage,
      creditsRemaining: byoApiKey ? null : user.credits - env.creditsPerAssistantCall,
      isAnonymous: false,
    },
  });
});

export default router;
