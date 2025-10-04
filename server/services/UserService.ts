import { BaseService } from './BaseService';
import { IStorage } from '../storage';
import type { User, Rating, Comment, Release, Artist } from '@shared/schema';

export interface UserStats {
  ratingsCount: number;
  commentsCount: number;
  averageRating: number;
  totalLikes: number;
  totalDislikes: number;
  recentActivity: number;
}

export interface UserRatingsFilters {
  search?: string;
  artist?: string;
  release?: string;
  sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low';
  withComments?: boolean;
}

export interface UserCommentsFilters {
  search?: string;
  artist?: string;
  release?: string;
  sortBy?: 'newest' | 'oldest' | 'likes_high' | 'likes_low';
}

export class UserService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Получает пользователя по ID
   */
  async getUser(userId: string): Promise<User | undefined> {
    try {
      return await this.storage.getUser(userId);
    } catch (error) {
      this.handleDatabaseError(error, 'getUser');
    }
  }

  /**
   * Получает статистику пользователя
   */
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const [ratings, comments] = await Promise.all([
        this.storage.getUserRatings(userId),
        this.storage.getUserComments(userId)
      ]);

      // Calculate average rating from reviews (comments with ratings)
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
        : 0;

      const totalLikes = comments.reduce((sum, comment) => sum + (comment as any).likeCount || 0, 0);
      const totalDislikes = comments.reduce((sum, comment) => sum + (comment as any).dislikeCount || 0, 0);

      // Активность за последние 30 дней (только отзывы)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentActivity = ratings.filter(rating => 
        new Date(rating.created_at || 0) > thirtyDaysAgo
      ).length;

      return {
        ratingsCount: ratings.length,
        commentsCount: comments.length,
        averageRating: Math.round(averageRating * 10) / 10, // Округляем до 1 знака
        totalLikes,
        totalDislikes,
        recentActivity
      };
    } catch (error) {
      this.handleDatabaseError(error, 'getUserStats');
    }
  }

  /**
   * Получает оценки пользователя с фильтрацией и сортировкой
   */
  async getUserRatings(userId: string, filters: UserRatingsFilters = {}): Promise<(Rating & { 
    release: Release & { artist: Artist };
    comment?: Comment;
  })[]> {
    try {
      let ratings = await this.storage.getUserRatings(userId);

      // Применяем фильтры
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        ratings = ratings.filter(rating => 
          rating.release.title.toLowerCase().includes(searchLower) ||
          rating.release.artist.name.toLowerCase().includes(searchLower)
        );
      }

      if (filters.artist) {
        const artistLower = filters.artist.toLowerCase();
        ratings = ratings.filter(rating => 
          rating.release.artist.name.toLowerCase().includes(artistLower)
        );
      }

      if (filters.release) {
        const releaseLower = filters.release.toLowerCase();
        ratings = ratings.filter(rating => 
          rating.release.title.toLowerCase().includes(releaseLower)
        );
      }

      if (filters.withComments) {
        // Здесь нужно будет добавить логику для фильтрации только оценок с комментариями
        // Пока что возвращаем все оценки
      }

      // Применяем сортировку
      switch (filters.sortBy) {
        case 'oldest':
          ratings.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
          break;
        case 'rating_high':
          ratings.sort((a, b) => b.score - a.score);
          break;
        case 'rating_low':
          ratings.sort((a, b) => a.score - b.score);
          break;
        case 'newest':
        default:
          ratings.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          break;
      }

      return ratings;
    } catch (error) {
      this.handleDatabaseError(error, 'getUserRatings');
    }
  }

  /**
   * Получает отзывы пользователя с фильтрацией и сортировкой
   */
  async getUserComments(userId: string, filters: UserCommentsFilters = {}): Promise<(Comment & { 
    release: Release & { artist: Artist };
    likeCount: number;
    dislikeCount: number;
  })[]> {
    try {
      let comments = await this.storage.getUserComments(userId);

      // Применяем фильтры
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        comments = comments.filter(comment => 
          comment.text?.toLowerCase().includes(searchLower) ||
          comment.release.title.toLowerCase().includes(searchLower) ||
          comment.release.artist.name.toLowerCase().includes(searchLower)
        );
      }

      if (filters.artist) {
        const artistLower = filters.artist.toLowerCase();
        comments = comments.filter(comment => 
          comment.release.artist.name.toLowerCase().includes(artistLower)
        );
      }

      if (filters.release) {
        const releaseLower = filters.release.toLowerCase();
        comments = comments.filter(comment => 
          comment.release.title.toLowerCase().includes(releaseLower)
        );
      }

      // Применяем сортировку
      switch (filters.sortBy) {
        case 'oldest':
          comments.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
          break;
        case 'likes_high':
          comments.sort((a, b) => (b as any).likeCount - (a as any).likeCount);
          break;
        case 'likes_low':
          comments.sort((a, b) => (a as any).likeCount - (b as any).likeCount);
          break;
        case 'newest':
        default:
          comments.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          break;
      }

      return comments;
    } catch (error) {
      this.handleDatabaseError(error, 'getUserComments');
    }
  }
}
