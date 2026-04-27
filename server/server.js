/**
 * AutoTweet Server
 * Main entry point for the Node.js backend
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import utilities and config
const logger = require('./utils/logger');
const { initializeFirebase } = require('./config/firebase');
const schedulerService = require('./services/schedulerService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const tweetRoutes = require('./routes/tweetRoutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');
const brandVoiceRoutes = require('./routes/brandVoiceRoutes');
const contentPillarRoutes = require('./routes/contentPillarRoutes');
const apiKeysRoutes = require('./routes/apiKeysRoutes');

// Import middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Initialize Express app
const app = express();

// Trust proxy (for production behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://127.0.0.1:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// HTTP logging
app.use(morgan('combined', { stream: logger.stream }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    scheduler: schedulerService.getStatus(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/tweets', tweetRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/brand-voice', brandVoiceRoutes);
app.use('/api/pillars', contentPillarRoutes);
app.use('/api/api-keys', apiKeysRoutes);

// Scheduler management endpoints
app.get('/api/scheduler/status', (req, res) => {
  res.json({
    success: true,
    status: schedulerService.getStatus(),
  });
});

app.post('/api/scheduler/run/:job', async (req, res) => {
  try {
    const { job } = req.params;
    await schedulerService.runJob(job);
    res.json({
      success: true,
      message: `Job '${job}' executed`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize Firebase
    logger.info('Initializing Firebase connection...');
    await initializeFirebase();
    
    // Start scheduler
    schedulerService.start();
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Client URL: ${process.env.CLIENT_URL || 'http://127.0.0.1:3000'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  schedulerService.stop();
  process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  schedulerService.stop();
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
 
