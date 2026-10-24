/**
 * Centralized error handling middleware.
 * Formats all uncaught errors into a consistent JSON response.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with this ${field} already exists.`;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors || {}).map((e) => e.message);
    message = errors.join(', ') || 'Validation error.';
  }

  const errorResponse = {
    success: false,
    error: {
      message,
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  };

  if (statusCode >= 500) {
    console.error(`❌ [Internal Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler for unmatched routes.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource not found at ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export default errorHandler;
