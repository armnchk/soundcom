import { BaseService } from './BaseService';
import { IStorage } from '../storage';
import { ValidationError } from '../middleware/errorHandler';
import type { InsertRating, Rating, Release, Artist } from '@shared/schema';

export interface RatingWithDetails extends Rating {
  release: Release & { artist: Artist };
}

export interface CreateRatingData {
  userId: string;
  releaseId: number;
  score: number;
}

export interface RatingStats {
  averageRating: number;
  count: number;
}

export class RatingService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Получает рейтинг пользователя для релиза
   */
  async getUserRating(userId: string, releaseId: number): Promise<Rating | null> {
    try {
      // Проверяем, что релиз существует
      await this.checkResourceExists(
        () => this.storage.getRelease(releaseId),
        'Release not found'
      );

      return await this.storage.getRating(userId, releaseId) || null;
    } catch (error) {
      this.handleDatabaseError(error, 'getUserRating');
    }
  }

  /**
   * Создает или обновляет рейтинг
   */
  async upsertRating(data: CreateRatingData): Promise<Rating> {
    try {
      // Проверяем, что релиз существует
      await this.checkResourceExists(
        () => this.storage.getRelease(data.releaseId),
        'Release not found'
      );

      // Валидируем бизнес-правила
      this.validateBusinessRules([
        () => data.score >= 1 || 'Score must be at least 1',
        () => data.score <= 10 || 'Score must be at most 10',
        () => Number.isInteger(data.score) || 'Score must be an integer'
      ]);

      const ratingData: InsertRating = {
        user_id: data.userId,
        release_id: data.releaseId,
        score: data.score
      };

      return await this.storage.upsertRating(ratingData);
    } catch (error) {
      this.handleDatabaseError(error, 'upsertRating');
    }
  }

  /**
   * Получает статистику рейтингов релиза
   */
  async getReleaseRatingStats(releaseId: number): Promise<RatingStats> {
    try {
      // Проверяем, что релиз существует
      await this.checkResourceExists(
        () => this.storage.getRelease(releaseId),
        'Release not found'
      );

      return await this.storage.getReleaseRatings(releaseId);
    } catch (error) {
      this.handleDatabaseError(error, 'getReleaseRatingStats');
    }
  }

  /**
   * Получает рейтинги пользователя
   */
  async getUserRatings(userId: string): Promise<RatingWithDetails[]> {
    try {
      return await this.storage.getUserRatings(userId);
    } catch (error) {
      this.handleDatabaseError(error, 'getUserRatings');
    }
  }

  /**
   * Удаляет рейтинг пользователя
   */
  async deleteRating(userId: string, releaseId: number): Promise<void> {
    try {
      // Проверяем, что релиз существует
      await this.checkResourceExists(
        () => this.storage.getRelease(releaseId),
        'Release not found'
      );

      // Проверяем, что рейтинг существует
      const existingRating = await this.storage.getRating(userId, releaseId);
      if (!existingRating) {
        throw new ValidationError([{
          field: 'rating',
          message: 'Rating not found',
          code: 'NOT_FOUND'
        }]);
      }

      // Здесь нужно добавить метод deleteRating в storage
      // await this.storage.deleteRating(userId, releaseId);
    } catch (error) {
      this.handleDatabaseError(error, 'deleteRating');
    }
  }

  /**
   * Получает топ релизов по рейтингу
   */
  async getTopRatedReleases(limit: number = 10): Promise<Release[]> {
    try {
      // Валидируем параметры
      this.validateBusinessRules([
        () => limit > 0 || 'Limit must be positive',
        () => limit <= 100 || 'Limit must be at most 100'
      ]);

      // Здесь можно добавить метод в storage для получения топ релизов
      // return await this.storage.getTopRatedReleases(limit);
      return [];
    } catch (error) {
      this.handleDatabaseError(error, 'getTopRatedReleases');
    }
  }

  /**
   * Получает статистику рейтингов пользователя
   */
  async getUserRatingStats(userId: string): Promise<{
    totalRatings: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    try {
      const ratings = await this.storage.getUserRatings(userId);
      
      const totalRatings = ratings.length;
      const averageRating = totalRatings > 0 
        ? ratings.reduce((sum, rating) => sum + rating.score, 0) / totalRatings 
        : 0;

      const ratingDistribution: Record<number, number> = {};
      for (let i = 1; i <= 10; i++) {
        ratingDistribution[i] = ratings.filter(r => r.score === i).length;
      }

      return {
        totalRatings,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution
      };
    } catch (error) {
      this.handleDatabaseError(error, 'getUserRatingStats');
    }
  }
}
