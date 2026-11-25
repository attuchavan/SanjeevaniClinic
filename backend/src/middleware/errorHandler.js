const { ZodError } = require('zod');

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) {
  // Check for Zod validation errors (compatible with both Zod v3 and v4)
  if (err instanceof ZodError || err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: issues.map((e) => ({
        path: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
        message: e.message,
      })),
    });
  }

  // Check for SQLite constraint errors
  if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
    let friendlyMessage = 'Database constraint error';
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      friendlyMessage = 'A record with this identifier already exists.';
    } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      friendlyMessage = 'Cannot perform action: referenced record does not exist or is in use.';
    }

    return res.status(409).json({
      success: false,
      message: friendlyMessage,
    });
  }

  // Generic internal server error
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error('[Error Handler]', {
    message: err.message,
    statusCode,
    path: req.originalUrl,
  });

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500 ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
