import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { securityLogger } from '../lib/securityLogger';
import { ValidationError } from './validation';
import type { ApiResponse, ValidationError as ApiValidationError } from '../types/api';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  public errors: ApiValidationError[];

  constructor(errors: ApiValidationError[], message: string = 'Validation failed') {
    super(message, 400);
    this.errors = errors;
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

/**
 * Централизованный обработчик ошибок
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: ValidationError[] | undefined;

  // Логирование ошибки
  // Структурированное логирование ошибок
  const errorLog = {
    level: 'error',
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.claims?.sub || 'anonymous',
    timestamp: new Date().toISOString(),
    statusCode: statusCode,
    errorType: error.constructor.name,
    requestId: req.headers['x-request-id'] || 'unknown'
  };
  
  console.error('Error occurred:', JSON.stringify(errorLog, null, 2));
  
  // Логируем подозрительные ошибки как события безопасности
  if (statusCode === 403) {
    securityLogger.logAuthorizationFailure(
      (req as any).user?.claims?.sub,
      req.ip,
      req.url,
      req.method,
      req.get('User-Agent')
    );
  } else if (statusCode === 429) {
    securityLogger.logRateLimitExceeded(
      req.ip,
      req.url,
      100, // предполагаемый лимит
      req.get('User-Agent'),
      (req as any).user?.claims?.sub
    );
  }

  // Обработка различных типов ошибок
  if (error instanceof CustomError) {
    statusCode = error.statusCode;
    message = error.message;
    
    if (error instanceof ValidationError) {
      errors = error.errors;
    }
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
  }

  // Формирование ответа
  const response: ApiResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  };

  if (errors) {
    response.errors = errors;
  }

  // В режиме разработки добавляем stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  } else {
    // В продакшене логируем stack trace, но не отправляем клиенту
    console.error('Error stack trace:', error.stack);
  }

  res.status(statusCode).json(response);
};

/**
 * Middleware для обработки 404 ошибок
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Middleware для обработки необработанных промисов
 */
export const unhandledRejectionHandler = (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Здесь можно добавить отправку уведомлений в систему мониторинга
};

/**
 * Middleware для обработки необработанных исключений
 */
export const uncaughtExceptionHandler = (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Здесь можно добавить отправку уведомлений в систему мониторинга
  process.exit(1);
};

/**
 * Async wrapper для автоматической обработки ошибок в async функциях
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware для логирования запросов
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      console.error('Request failed:', logData);
    } else {
      console.log('Request completed:', logData);
    }
  });

  next();
};
