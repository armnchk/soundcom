import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import type { AuthUser } from '../types/api';
import { securityLogger } from '../lib/securityLogger';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser & {
    claims?: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      picture?: string;
    };
  };
}

/**
 * Middleware для проверки аутентификации
 */
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    securityLogger.logAuthAttempt(false, undefined, req.ip, req.get('User-Agent'), {
      url: req.url,
      method: req.method
    });
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user) {
    securityLogger.logAuthAttempt(false, undefined, req.ip, req.get('User-Agent'), {
      url: req.url,
      method: req.method,
      reason: 'User not found in session'
    });
    return next(new UnauthorizedError('User not found in session'));
  }

  // Логируем успешную аутентификацию
  securityLogger.logAuthAttempt(true, req.user.id, req.ip, req.get('User-Agent'), {
    url: req.url,
    method: req.method
  });

  next();
};

/**
 * Middleware для проверки административных прав
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user) {
    return next(new UnauthorizedError('User not found in session'));
  }

  if (!req.user.is_admin) {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
};

/**
 * Middleware для проверки владения ресурсом
 */
export const requireOwnership = (userIdField: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!req.user) {
      return next(new UnauthorizedError('User not found in session'));
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    if (!resourceUserId) {
      return next(new UnauthorizedError('Resource user ID not provided'));
    }

    // Админы могут управлять любыми ресурсами
    if (req.user.is_admin) {
      return next();
    }

    // Проверяем, что пользователь владеет ресурсом
    if (req.user.id !== resourceUserId && req.user.google_id !== resourceUserId) {
      securityLogger.logDataAccessViolation(
        req.user.id,
        'resource',
        resourceUserId,
        'access',
        req.ip,
        req.get('User-Agent')
      );
      return next(new ForbiddenError('Access denied: you can only manage your own resources'));
    }

    next();
  };
};

/**
 * Middleware для проверки наличия никнейма
 */
export const requireNickname = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user) {
    return next(new UnauthorizedError('User not found in session'));
  }

  if (!req.user.nickname) {
    return res.status(400).json({
      success: false,
      message: 'Nickname is required',
      code: 'NICKNAME_REQUIRED',
      redirectTo: '/profile'
    });
  }

  next();
};

/**
 * Middleware для опциональной аутентификации
 * Не блокирует запрос, если пользователь не аутентифицирован
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Просто продолжаем выполнение, независимо от статуса аутентификации
  next();
};

/**
 * Middleware для проверки CSRF токена
 */
export const requireCSRF = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = req.session?.csrfSecret;

  if (!token || !sessionToken || token !== sessionToken) {
    return next(new UnauthorizedError('Invalid CSRF token'));
  }

  next();
};

/**
 * Middleware для проверки API ключа (для внешних интеграций)
 */
export const requireAPIKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validAPIKey = process.env.API_KEY;

  if (!apiKey || !validAPIKey || apiKey !== validAPIKey) {
    return next(new UnauthorizedError('Invalid API key'));
  }

  next();
};

/**
 * Middleware для проверки прав доступа к релизу
 */
export const requireReleaseAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Здесь можно добавить логику проверки доступа к конкретному релизу
  // Например, проверка на приватные релизы, возрастные ограничения и т.д.
  next();
};

/**
 * Middleware для проверки лимитов пользователя
 */
export const checkUserLimits = (limitType: 'comments' | 'ratings' | 'reports') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('User not found'));
    }

    // Здесь можно добавить логику проверки лимитов пользователя
    // Например, количество комментариев в день, рейтингов и т.д.
    
    next();
  };
};
