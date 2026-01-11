import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
// Rate limiting jobs
import { startBalanceCheckJob } from './jobs/balanceCheck.job';

const app = express();

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import marketRoutes from './routes/market.routes';
import adminRoutes from './routes/admin.routes';

// ...

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminRoutes);

// Trust proxy for Nginx reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start cron jobs
    startBalanceCheckJob();

    // Start listening
    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 Server running on port ${config.PORT}`);
      logger.info(`📝 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 API: http://localhost:${config.PORT}`);
      logger.info(`📊 Routes:`);
      logger.info(`   POST /api/auth/register`);
      logger.info(`   POST /api/auth/login`);
      logger.info(`   POST /api/auth/verify-email`);
      logger.info(`   GET  /api/users/profile`);
      logger.info(`   POST /api/users/api-keys`);
      logger.info(`   POST /api/users/gatekeeper/check`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
