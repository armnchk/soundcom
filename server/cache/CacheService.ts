interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

interface CacheEntry<T> {
  data: T;
  expires: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL: number;
  private prefix: string;

  constructor(defaultTTL: number = 300, prefix: string = 'app') {
    this.defaultTTL = defaultTTL;
    this.prefix = prefix;
  }

  /**
   * Генерирует ключ кэша
   */
  private generateKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Получает данные из кэша
   */
  get<T>(key: string): T | null {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Проверяем, не истек ли срок действия
    if (Date.now() > entry.expires) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Сохраняет данные в кэш
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const cacheKey = this.generateKey(key);
    const ttl = options.ttl || this.defaultTTL;
    const expires = Date.now() + (ttl * 1000);

    this.cache.set(cacheKey, {
      data,
      expires
    });
  }

  /**
   * Удаляет данные из кэша
   */
  delete(key: string): boolean {
    const cacheKey = this.generateKey(key);
    return this.cache.delete(cacheKey);
  }

  /**
   * Очищает кэш по паттерну
   */
  clear(pattern?: string): number {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      return size;
    }

    const regex = new RegExp(pattern);
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Получает или создает данные с кэшированием
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, options);
    return data;
  }

  /**
   * Проверяет существование ключа в кэше
   */
  has(key: string): boolean {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return false;
    }

    // Проверяем, не истек ли срок действия
    if (Date.now() > entry.expires) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Получает статистику кэша
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    const keys = Array.from(this.cache.keys());
    const memoryUsage = process.memoryUsage().heapUsed;

    return {
      size: this.cache.size,
      keys,
      memoryUsage
    };
  }

  /**
   * Очищает истекшие записи
   */
  cleanup(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Запускает периодическую очистку кэша
   */
  startCleanup(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      const deleted = this.cleanup();
      if (deleted > 0) {
        console.log(`Cache cleanup: removed ${deleted} expired entries`);
      }
    }, intervalMs);
  }
}

// Создаем глобальный экземпляр кэша
export const cache = new CacheService(300, 'budgetbuddy'); // 5 минут по умолчанию

// Запускаем автоматическую очистку каждую минуту
cache.startCleanup(60000);
