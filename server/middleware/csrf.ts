import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { UnauthorizedError } from './errorHandler';
import { securityLogger } from '../lib/securityLogger';

interface CSRFConfig {
  secretLength?: number;
  tokenLength?: number;
  cookieName?: string;
  headerName?: string;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  };
}

const defaultConfig: Required<CSRFConfig> = {
  secretLength: 32,
  tokenLength: 32,
  cookieName: '_csrf',
  headerName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  }
};

/**
 * Генерирует CSRF секрет
 */
function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Генерирует CSRF токен на основе секрета и сессии
 */
function generateToken(secret: string, sessionId: string): string {
  const hash = crypto.createHmac('sha256', secret);
  hash.update(sessionId);
  return hash.digest('hex');
}

/**
 * Middleware для инициализации CSRF защиты
 */
export const csrfInit = (config: CSRFConfig = {}) => {
  const options = { ...defaultConfig, ...config };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Инициализируем сессию если её нет
    if (!req.session) {
      return next();
    }

    // Генерируем секрет для CSRF если его нет
    if (!req.session.csrfSecret) {
      req.session.csrfSecret = generateSecret(options.secretLength);
    }

    // Генерируем токен для текущей сессии
    const sessionId = req.sessionID || 'anonymous';
    const token = generateToken(req.session.csrfSecret, sessionId);

    // Устанавливаем токен в cookie
    res.cookie(options.cookieName, token, options.cookieOptions);

    // Добавляем токен в локальные переменные для использования в шаблонах
    res.locals.csrfToken = token;

    next();
  };
};

/**
 * Middleware для проверки CSRF токена
 */
export const csrfProtection = (config: CSRFConfig = {}) => {
  const options = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    // Пропускаем GET, HEAD, OPTIONS запросы
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Пропускаем запросы без сессии (например, API с токенами)
    if (!req.session) {
      return next();
    }

    const sessionId = req.sessionID || 'anonymous';
    const secret = req.session.csrfSecret;

    if (!secret) {
      return next(new UnauthorizedError('CSRF secret not found in session'));
    }

    // Получаем токен из заголовка или тела запроса
    const token = req.headers[options.headerName] as string || 
                  req.body?._csrf || 
                  req.query?._csrf as string;

    if (!token) {
      securityLogger.logCSRFViolation(
        req.ip,
        req.url,
        req.method,
        req.get('User-Agent'),
        (req as any).user?.claims?.sub
      );
      return next(new UnauthorizedError('CSRF token not provided'));
    }

    // Проверяем токен
    const expectedToken = generateToken(secret, sessionId);
    
    if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
      securityLogger.logCSRFViolation(
        req.ip,
        req.url,
        req.method,
        req.get('User-Agent'),
        (req as any).user?.claims?.sub
      );
      return next(new UnauthorizedError('Invalid CSRF token'));
    }

    next();
  };
};

/**
 * Middleware для получения CSRF токена через API
 */
export const getCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.csrfSecret) {
    return res.status(400).json({
      success: false,
      message: 'CSRF secret not found in session'
    });
  }

  const sessionId = req.sessionID || 'anonymous';
  const token = generateToken(req.session.csrfSecret, sessionId);

  res.json({
    success: true,
    token,
    headerName: defaultConfig.headerName
  });
};

/**
 * Утилита для проверки CSRF токена в коде
 */
export const verifyCSRFToken = (token: string, secret: string, sessionId: string): boolean => {
  try {
    const expectedToken = generateToken(secret, sessionId);
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch (error) {
    return false;
  }
};

/**
 * Middleware для обновления CSRF токена после успешной аутентификации
 */
export const refreshCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.csrfSecret) {
    // Генерируем новый секрет
    req.session.csrfSecret = generateSecret(defaultConfig.secretLength);
    
    // Генерируем новый токен
    const sessionId = req.sessionID || 'anonymous';
    const token = generateToken(req.session.csrfSecret, sessionId);
    
    // Обновляем cookie
    res.cookie(defaultConfig.cookieName, token, defaultConfig.cookieOptions);
    res.locals.csrfToken = token;
  }
  
  next();
};

/**
 * Middleware для исключения определенных путей из CSRF защиты
 */
export const csrfExclude = (excludedPaths: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    
    if (excludedPaths.some(excludedPath => {
      if (excludedPath.endsWith('*')) {
        return path.startsWith(excludedPath.slice(0, -1));
      }
      return path === excludedPath;
    })) {
      return next();
    }
    
    return csrfProtection()(req, res, next);
  };
};
