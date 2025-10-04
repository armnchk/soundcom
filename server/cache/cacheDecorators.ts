import { cache } from './CacheService';

/**
 * Декоратор для кэширования результатов методов
 */
export function Cacheable(options: {
  ttl?: number;
  keyGenerator?: (...args: any[]) => string;
  condition?: (...args: any[]) => boolean;
} = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const { ttl = 300, keyGenerator, condition } = options;

    descriptor.value = async function (...args: any[]) {
      // Проверяем условие кэширования
      if (condition && !condition.apply(this, args)) {
        return method.apply(this, args);
      }

      // Генерируем ключ кэша
      const key = keyGenerator 
        ? keyGenerator.apply(this, args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

      // Пытаемся получить данные из кэша
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Выполняем метод и кэшируем результат
      const result = await method.apply(this, args);
      cache.set(key, result, { ttl });
      
      return result;
    };
  };
}

/**
 * Декоратор для инвалидации кэша
 */
export function CacheInvalidate(pattern: string | ((...args: any[]) => string)) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      
      // Инвалидируем кэш
      const keyPattern = typeof pattern === 'function' 
        ? pattern.apply(this, args)
        : pattern;
      
      cache.clear(keyPattern);
      
      return result;
    };
  };
}

/**
 * Декоратор для кэширования с зависимостями
 */
export function CacheWithDependencies(
  dependencies: string[],
  options: {
    ttl?: number;
    keyGenerator?: (...args: any[]) => string;
  } = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const { ttl = 300, keyGenerator } = options;

    descriptor.value = async function (...args: any[]) {
      // Генерируем ключ кэша
      const key = keyGenerator 
        ? keyGenerator.apply(this, args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

      // Пытаемся получить данные из кэша
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Выполняем метод и кэшируем результат
      const result = await method.apply(this, args);
      cache.set(key, result, { ttl });
      
      return result;
    };
  };
}

/**
 * Утилита для создания ключей кэша
 */
export class CacheKeyBuilder {
  private parts: string[] = [];

  constructor(prefix: string) {
    this.parts.push(prefix);
  }

  add(value: any): CacheKeyBuilder {
    this.parts.push(String(value));
    return this;
  }

  addObject(obj: Record<string, any>): CacheKeyBuilder {
    const sortedKeys = Object.keys(obj).sort();
    for (const key of sortedKeys) {
      this.parts.push(`${key}:${obj[key]}`);
    }
    return this;
  }

  build(): string {
    return this.parts.join(':');
  }
}

/**
 * Утилита для работы с кэшем
 */
export class CacheUtils {
  /**
   * Создает ключ кэша для релиза
   */
  static releaseKey(id: number): string {
    return new CacheKeyBuilder('release').add(id).build();
  }

  /**
   * Создает ключ кэша для списка релизов
   */
  static releasesListKey(filters: Record<string, any>): string {
    return new CacheKeyBuilder('releases')
      .addObject(filters)
      .build();
  }

  /**
   * Создает ключ кэша для исполнителя
   */
  static artistKey(id: number): string {
    return new CacheKeyBuilder('artist').add(id).build();
  }

  /**
   * Создает ключ кэша для коллекции
   */
  static collectionKey(id: number): string {
    return new CacheKeyBuilder('collection').add(id).build();
  }

  /**
   * Создает ключ кэша для поиска
   */
  static searchKey(query: string, type: string): string {
    return new CacheKeyBuilder('search')
      .add(type)
      .add(query.toLowerCase())
      .build();
  }

  /**
   * Инвалидирует кэш для релиза
   */
  static invalidateRelease(id: number): void {
    cache.delete(CacheUtils.releaseKey(id));
    cache.clear('releases:*');
    cache.clear('search:*');
  }

  /**
   * Инвалидирует кэш для исполнителя
   */
  static invalidateArtist(id: number): void {
    cache.delete(CacheUtils.artistKey(id));
    cache.clear('releases:*');
    cache.clear('search:*');
  }

  /**
   * Инвалидирует кэш для коллекции
   */
  static invalidateCollection(id: number): void {
    cache.delete(CacheUtils.collectionKey(id));
    cache.clear('collections:*');
    cache.clear('collections:true'); // Инвалидируем кэш активных коллекций
    cache.clear('collections:false'); // Инвалидируем кэш неактивных коллекций
  }

  /**
   * Инвалидирует весь кэш
   */
  static invalidateAll(): void {
    cache.clear();
  }
}
