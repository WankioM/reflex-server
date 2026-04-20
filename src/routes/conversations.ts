import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Errors } from '../errors/errorCodes';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    Conversation.find({ userId: req.authUser!.userId, status: { $ne: 'deleted' } })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments({ userId: req.authUser!.userId, status: { $ne: 'deleted' } }),
  ]);

  res.json({
    data: conversations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  const conversation = await Conversation.create({
    userId: req.authUser!.userId,
    title: req.body.title || 'New conversation',
  });

  res.status(201).json({ data: conversation });
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    userId: req.authUser!.userId,
    status: { $ne: 'deleted' },
  }).lean();

  if (!conversation) {
    const err = Errors.NOT_FOUND('Conversation');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const skip = (page - 1) * limit;

  const [messages, totalMessages] = await Promise.all([
    Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments({ conversationId: conversation._id }),
  ]);

  res.json({
    data: { ...conversation, messages },
    pagination: { page, limit, total: totalMessages, totalPages: Math.ceil(totalMessages / limit) },
  });
});

router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  const { title, status } = req.body;
  const update: Record<string, string> = {};
  if (title) update.title = title;
  if (status && ['active', 'archived'].includes(status)) update.status = status;

  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, userId: req.authUser!.userId },
    update,
    { new: true }
  ).lean();

  if (!conversation) {
    const err = Errors.NOT_FOUND('Conversation');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  res.json({ data: conversation });
});

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, userId: req.authUser!.userId },
    { status: 'deleted' },
    { new: true }
  );

  if (!conversation) {
    const err = Errors.NOT_FOUND('Conversation');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  res.json({ message: 'Conversation deleted.' });
});

export default router;
