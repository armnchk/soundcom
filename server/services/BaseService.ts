import { IStorage } from '../storage';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';

export abstract class BaseService {
  protected storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Проверяет существование ресурса
   */
  protected async checkResourceExists<T>(
    checkFn: () => Promise<T | undefined>,
    errorMessage: string
  ): Promise<T> {
    const resource = await checkFn();
    if (!resource) {
      throw new NotFoundError(errorMessage);
    }
    return resource;
  }

  /**
   * Проверяет уникальность поля
   */
  protected async checkUniqueness(
    checkFn: () => Promise<boolean>,
    errorMessage: string
  ): Promise<void> {
    const isUnique = await checkFn();
    if (!isUnique) {
      throw new ConflictError(errorMessage);
    }
  }

  /**
   * Валидирует бизнес-правила
   */
  protected validateBusinessRules(rules: (() => boolean | string)[]): void {
    for (const rule of rules) {
      const result = rule();
      if (result !== true) {
        throw new ValidationError([{
          field: 'business_rule',
          message: typeof result === 'string' ? result : 'Business rule validation failed',
          code: 'BUSINESS_RULE_VIOLATION'
        }]);
      }
    }
  }

  /**
   * Обрабатывает ошибки базы данных
   */
  protected handleDatabaseError(error: any, context: string): never {
    console.error(`Database error in ${context}:`, error);
    
    if (error.code === '23505') { // Unique constraint violation
      throw new ConflictError('Resource already exists');
    }
    
    if (error.code === '23503') { // Foreign key constraint violation
      throw new ValidationError([{
        field: 'reference',
        message: 'Referenced resource does not exist',
        code: 'FOREIGN_KEY_VIOLATION'
      }]);
    }
    
    throw error;
  }
}
