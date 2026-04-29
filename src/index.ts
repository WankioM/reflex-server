import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { env } from './config/env';
import { connectDB } from './config/db';
import './config/passport';

import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import creditRoutes from './routes/credits';
import conversationRoutes from './routes/conversations';
import connectionRoutes from './routes/connections';
import assistantRoutes from './routes/assistant';
import adminRoutes from './routes/admin';
import teamRoutes from './routes/team';
import paymentRoutes from './routes/payments';
import projectRoutes from './routes/projects';
import validateRoutes from './routes/validate';

const app = express();

// Global middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      env.frontendUrl,
      'http://localhost:3000',
      'http://localhost:3001',
    ];
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowed.includes(origin)) {
      callback(null, origin || true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(cookieParser());

// Stripe webhook needs raw body — must come before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use(passport.initialize());
app.use(generalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/validate', validateRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start
async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server] Reflex backend running on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});

export default app;
