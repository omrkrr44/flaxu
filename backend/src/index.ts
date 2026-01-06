import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

const app = express();

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
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// API routes will be added here
// TODO: Import and use routes
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/trades', tradeRoutes);
// etc.

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 Server running on port ${config.PORT}`);
      logger.info(`📝 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 API: http://localhost:${config.PORT}`);
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
