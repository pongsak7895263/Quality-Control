// middleware/errorHandler.js - Global Error Handler
const { ValidationError, DatabaseError, ConnectionError } = require('sequelize');

const errorHandler = (error, req, res, next) => {
  console.error('Error Details:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.username || 'Anonymous',
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle specific error types
  if (error instanceof ValidationError) {
    statusCode = 400;
    message = 'Validation Error';
    details = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
  } else if (error instanceof DatabaseError) {
    statusCode = 500;
    message = 'Database Error';
    
    // Handle specific database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      statusCode = 409;
      message = 'Duplicate entry found';
      details = error.errors.map(err => ({
        field: err.path,
        message: `${err.path} must be unique`,
        value: err.value
      }));
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      statusCode = 400;
      message = 'Invalid reference to related record';
    }
  } else if (error instanceof ConnectionError) {
    statusCode = 503;
    message = 'Database connection failed';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    }
  }

  // Handle custom application errors
  if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
  }

  // Don't expose sensitive error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong';
    details = null;
  }

  const errorResponse = {
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      originalError: error.message 
    }),
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(errorResponse);
};

// Custom Error Classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400);
    this.details = details;
  }
}

module.exports = {
  errorHandler,
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError
};