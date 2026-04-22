import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { Project } from '../models/Project';
import { Conversation } from '../models/Conversation';
import { Errors } from '../errors/errorCodes';

const router = Router();

// GET /api/projects — list user's projects with conversation count
router.get('/', authenticate, async (req: Request, res: Response) => {
  const status = (req.query.status as string) || 'active';
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const skip = (page - 1) * limit;

  const filter = { userId: req.authUser!.userId, status };

  const [projects, total] = await Promise.all([
    Project.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);

  // Attach conversation counts
  const projectIds = projects.map((p) => p._id);
  const counts = await Conversation.aggregate([
    { $match: { projectId: { $in: projectIds }, status: { $ne: 'deleted' } } },
    { $group: { _id: '$projectId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  const data = projects.map((p) => ({
    ...p,
    conversationCount: countMap.get(p._id.toString()) || 0,
  }));

  res.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// POST /api/projects — create project
router.post('/', authenticate, async (req: Request, res: Response) => {
  const { name, description, source, githubRepo } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    const err = Errors.VALIDATION_ERROR('Project name is required.');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  const project = await Project.create({
    userId: req.authUser!.userId,
    name: name.trim(),
    description: description?.trim() || '',
    source: source === 'github' ? 'github' : 'manual',
    githubRepo: source === 'github' && githubRepo ? githubRepo : null,
  });

  res.status(201).json({ data: project });
});

// GET /api/projects/:id — get project with its conversations
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.authUser!.userId,
  }).lean();

  if (!project) {
    const err = Errors.NOT_FOUND('Project');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  const conversations = await Conversation.find({
    projectId: project._id,
    status: { $ne: 'deleted' },
  })
    .sort({ lastMessageAt: -1 })
    .lean();

  res.json({ data: { ...project, conversations } });
});

// PATCH /api/projects/:id — update project
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  const { name, description, status } = req.body;
  const update: Record<string, string> = {};

  if (name && typeof name === 'string') update.name = name.trim();
  if (typeof description === 'string') update.description = description.trim();
  if (status && ['active', 'archived'].includes(status)) update.status = status;

  if (Object.keys(update).length === 0) {
    const err = Errors.VALIDATION_ERROR('No valid fields to update.');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, userId: req.authUser!.userId },
    update,
    { new: true }
  ).lean();

  if (!project) {
    const err = Errors.NOT_FOUND('Project');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  res.json({ data: project });
});

// DELETE /api/projects/:id — soft delete (archive)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, userId: req.authUser!.userId },
    { status: 'archived' },
    { new: true }
  );

  if (!project) {
    const err = Errors.NOT_FOUND('Project');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  res.json({ message: 'Project archived.' });
});

// POST /api/projects/:id/conversations — create conversation within a project
router.post('/:id/conversations', authenticate, async (req: Request, res: Response) => {
  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.authUser!.userId,
    status: 'active',
  });

  if (!project) {
    const err = Errors.NOT_FOUND('Project');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  const conversation = await Conversation.create({
    userId: req.authUser!.userId,
    projectId: project._id,
    title: req.body.title || 'New conversation',
  });

  res.status(201).json({ data: conversation });
});

// GET /api/projects/:id/conversations — list conversations for a project
router.get('/:id/conversations', authenticate, async (req: Request, res: Response) => {
  const project = await Project.findOne({
    _id: req.params.id,
    userId: req.authUser!.userId,
  });

  if (!project) {
    const err = Errors.NOT_FOUND('Project');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    Conversation.find({ projectId: project._id, status: { $ne: 'deleted' } })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments({ projectId: project._id, status: { $ne: 'deleted' } }),
  ]);

  res.json({
    data: conversations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export default router;
