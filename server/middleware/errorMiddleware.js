/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

const logger = require('../utils/logger');
const { getDb, collections } = require('../config/firebase');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Log error to database
 */
const logErrorToDb = async (error, req) => {
  try {
    const db = getDb();
    await db.collection(collections.ERROR_LOG).add({
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
      code: error.code,
      path: req.path,
      method: req.method,
      userId: req.user?.id || null,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date(),
    });
  } catch (dbError) {
    logger.error('Failed to log error to database:', dbError);
  }
};

/**
 * Handle Twitter API errors
 */
const handleTwitterError = (error) => {
  if (error.code === 429) {
    return new ApiError(429, 'Rate limit exceeded. Please try again later.', 'RATE_LIMITED');
  }
  
  if (error.code === 401) {
    return new ApiError(401, 'Twitter authentication failed. Please re-authenticate.', 'TWITTER_AUTH_FAILED');
  }
  
  if (error.code === 403) {
    return new ApiError(403, 'Twitter API access forbidden.', 'TWITTER_FORBIDDEN');
  }
  
  return new ApiError(500, 'Twitter API error', 'TWITTER_ERROR');
};

/**
 * Handle Firebase errors
 */
const handleFirebaseError = (error) => {
  if (error.code === 'permission-denied') {
    return new ApiError(403, 'Database access denied', 'DB_PERMISSION_DENIED');
  }
  
  if (error.code === 'unavailable') {
    return new ApiError(503, 'Database temporarily unavailable', 'DB_UNAVAILABLE');
  }
  
  return new ApiError(500, 'Database error', 'DB_ERROR');
};

/**
 * Handle validation errors
 */
const handleValidationError = (error) => {
  const errors = error.errors || [];
  const messages = errors.map(e => e.msg).join(', ');
  return new ApiError(400, messages || 'Validation failed', 'VALIDATION_ERROR');
};

/**
 * Not found handler
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Resource not found: ${req.originalUrl}`, 'NOT_FOUND');
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = async (err, req, res, next) => {
  let error = err;
  
  // Handle specific error types
  if (err.name === 'TwitterApiError' || err.rateLimitError) {
    error = handleTwitterError(err);
  } else if (err.code && typeof err.code === 'string' && err.code.includes('firestore')) {
    error = handleFirebaseError(err);
  } else if (err.name === 'ValidationError' || err.array) {
    error = handleValidationError(err);
  } else if (err.status === 402 || err.message?.includes('402')) {
    error = new ApiError(402, 'Payment required. Please check your API billing status (OpenAI or Twitter).', 'PAYMENT_REQUIRED');
  } else if (!(err instanceof ApiError)) {
    // Unknown error
    error = new ApiError(500, err.message || 'Internal server error', 'INTERNAL_ERROR');
  }
  
  // Log error
  const isServerError = error.statusCode >= 500;
  if (isServerError) {
    logger.error('Server error:', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });
    
    // Log to database for severe errors
    await logErrorToDb(error, req);
  } else {
    logger.warn('Client error:', {
      message: error.message,
      statusCode: error.statusCode,
      path: req.path,
    });
  }
  
  // Send response
  const response = {
    success: false,
    error: err.data?.detail || err.detail || error.message,
    code: error.code,
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }
  
  res.status(error.statusCode || 500).json(response);
};

/**
 * Async handler wrapper
 * Catches async errors and passes them to the error handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  notFound,
  errorHandler,
  asyncHandler,
};



