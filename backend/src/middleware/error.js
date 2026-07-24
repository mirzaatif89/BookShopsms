export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(error, req, res, next) {
  const status = error.status || 500;
  res.status(status).json({
    message: error.message || 'Internal server error',
    errors: error.errors || undefined
  });
}
