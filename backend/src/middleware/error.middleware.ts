import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    console.error(`[ERROR] ${req.method} ${req.path}`, err);
  }

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    // Stack traces are ONLY shown in development — never in production
    ...(isDev && { stack: err.stack }),
  });
};
