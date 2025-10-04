import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './errorHandler';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Простое in-memory хранилище для rate limiting
// В продакшене лучше использовать Redis
class MemoryRateLimitStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Очищаем истекшие записи каждые 5 минут
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const record = this.store[key];
    if (!record) return null;

    const now = Date.now();
    if (record.resetTime < now) {
      delete this.store[key];
      return null;
    }

    return record;
  }

  async set(key: string, count: number, resetTime: number): Promise<void> {
    this.store[key] = { count, resetTime };
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    const existing = await this.get(key);
    
    if (existing) {
      existing.count++;
      await this.set(key, existing.count, existing.resetTime);
      return existing;
    } else {
      const newRecord = { count: 1, resetTime };
      await this.set(key, 1, resetTime);
      return newRecord;
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  // Метод для полной очистки store (для разработки)
  clear() {
    this.store = {};
  }
}

const store = new MemoryRateLimitStore();

/**
 * Создает middleware для rate limiting
 */
export const createRateLimit = (config: RateLimitConfig) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => req.ip || 'unknown'
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const { count, resetTime } = await store.increment(key, windowMs);

      // Устанавливаем заголовки rate limit
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': Math.max(0, max - count).toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString()
      });

      if (count > max) {
        return next(new RateLimitError(message));
      }

      // Пропускаем успешные запросы, если настроено
      if (skipSuccessfulRequests) {
        const originalSend = res.send;
        res.send = function(data) {
          if (res.statusCode < 400) {
            // Уменьшаем счетчик для успешных запросов
            store.get(key).then(record => {
              if (record && record.count > 0) {
                store.set(key, record.count - 1, record.resetTime);
              }
            });
          }
          return originalSend.call(this, data);
        };
      }

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next(error);
    }
  };
};

// Предустановленные конфигурации rate limiting
export const rateLimits = {
  // Общий лимит для всех API
  general: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 1000, // 1000 запросов (увеличено для разработки)
    message: 'Too many requests from this IP, please try again later'
  }),

  // Строгий лимит для аутентификации
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // 5 попыток входа
    message: 'Too many authentication attempts, please try again later'
  }),

  // Лимит для создания контента
  create: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 200, // 200 созданий в час (увеличено для разработки)
    message: 'Too many content creation attempts, please try again later'
  }),

  // Лимит для поиска
  search: createRateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 30, // 30 поисковых запросов в минуту
    message: 'Too many search requests, please slow down'
  }),

  // Лимит для импорта (только для админов)
  import: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 10, // 10 импортов в час
    message: 'Too many import requests, please try again later'
  }),

  // Лимит для комментариев
  comments: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 200, // 200 комментариев в час (увеличено для разработки)
    message: 'Too many comments, please try again later'
  }),

  // Лимит для рейтингов
  ratings: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 300, // 300 рейтингов в час (увеличено для разработки)
    message: 'Too many rating attempts, please try again later'
  }),

  // Лимит для жалоб
  reports: createRateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 часа
    max: 10, // 10 жалоб в день
    message: 'Too many reports, please try again later'
  })
};

/**
 * Middleware для rate limiting по пользователю (требует аутентификации)
 */
export const userRateLimit = (config: Omit<RateLimitConfig, 'keyGenerator'>) => {
  return createRateLimit({
    ...config,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      return user ? `user:${user.id}` : req.ip || 'unknown';
    }
  });
};

/**
 * Middleware для rate limiting по IP и пользователю
 */
export const combinedRateLimit = (config: Omit<RateLimitConfig, 'keyGenerator'>) => {
  return createRateLimit({
    ...config,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const ip = req.ip || 'unknown';
      return user ? `combined:${user.id}:${ip}` : `ip:${ip}`;
    }
  });
};

// Экспорт функции для очистки store (для разработки)
export const clearRateLimitStore = () => {
  store.clear();
};

// Очистка при завершении процесса
process.on('SIGINT', () => {
  store.destroy();
});

process.on('SIGTERM', () => {
  store.destroy();
});
