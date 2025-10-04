import { BaseService } from './BaseService';
import { IStorage } from '../storage';
import { ConflictError, ValidationError } from '../middleware/errorHandler';
import type { InsertRelease, Release, Artist } from '@shared/schema';

export interface ReleaseWithDetails extends Release {
  artist: Artist;
  averageRating: number;
  commentCount: number;
}

export interface ReleaseFilters {
  genre?: string;
  year?: number;
  artistId?: number;
  includeTestData?: boolean;
}

export interface AdminReleaseFilters {
  page: number;
  limit: number;
  search: string;
  type: string;
  artist: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  showTestData: boolean;
}

export class ReleaseService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Получает релизы с фильтрами
   */
  async getReleases(filters?: ReleaseFilters): Promise<ReleaseWithDetails[]> {
    try {
      const releases = await this.storage.getReleases(filters);
      
      // Convert string values to numbers
      return releases.map(release => ({
        ...release,
        averageRating: Number(release.averageRating) || 0,
        commentCount: Number(release.commentCount) || 0
      }));
    } catch (error) {
      this.handleDatabaseError(error, 'getReleases');
    }
  }

  /**
   * Получает релиз по ID
   */
  async getRelease(id: number): Promise<ReleaseWithDetails> {
    const release = await this.checkResourceExists(
      () => this.storage.getRelease(id),
      'Release not found'
    );
    
    // Convert string values to numbers
    return {
      ...release,
      averageRating: Number(release.averageRating) || 0,
      commentCount: Number(release.commentCount) || 0
    };
  }

  /**
   * Создает новый релиз
   */
  async createRelease(data: InsertRelease): Promise<Release> {
    try {
      // Проверяем, что исполнитель существует
      await this.checkResourceExists(
        () => this.storage.getArtist(data.artist_id),
        'Artist not found'
      );

      // Проверяем уникальность релиза
      const existingRelease = await this.storage.getReleaseByTitleAndArtist(
        data.title, 
        data.artist_id
      );
      
      if (existingRelease) {
        throw new ConflictError('Release with this title already exists for this artist');
      }

      // Валидируем бизнес-правила
      this.validateBusinessRules([
        () => data.title.length >= 1 || 'Title is required',
        () => data.title.length <= 255 || 'Title too long',
        () => !data.release_date || new Date(data.release_date) <= new Date() || 'Release date cannot be in the future',
        () => !data.total_tracks || data.total_tracks >= 0 || 'Total tracks must be non-negative',
        () => !data.duration || data.duration >= 0 || 'Duration must be non-negative'
      ]);

      return await this.storage.createRelease(data);
    } catch (error) {
      this.handleDatabaseError(error, 'createRelease');
    }
  }

  /**
   * Обновляет релиз
   */
  async updateRelease(id: number, data: Partial<InsertRelease>): Promise<Release> {
    try {
      // Проверяем, что релиз существует
      await this.checkResourceExists(
        () => this.storage.getRelease(id),
        'Release not found'
      );

      // Если обновляется исполнитель, проверяем его существование
      if (data.artist_id) {
        await this.checkResourceExists(
          () => this.storage.getArtist(data.artist_id!),
          'Artist not found'
        );
      }

      // Если обновляется название, проверяем уникальность
      if (data.title) {
        const existingRelease = await this.storage.getReleaseByTitleAndArtist(
          data.title, 
          data.artist_id || (await this.storage.getRelease(id))?.artist_id!
        );
        
        if (existingRelease && existingRelease.id !== id) {
          throw new ConflictError('Release with this title already exists for this artist');
        }
      }

      // Валидируем бизнес-правила
      this.validateBusinessRules([
        () => !data.title || data.title.length >= 1 || 'Title is required',
        () => !data.title || data.title.length <= 255 || 'Title too long',
        () => !data.release_date || new Date(data.release_date) <= new Date() || 'Release date cannot be in the future',
        () => !data.total_tracks || data.total_tracks >= 0 || 'Total tracks must be non-negative',
        () => !data.duration || data.duration >= 0 || 'Duration must be non-negative'
      ]);

      return await this.storage.updateRelease(id, data);
    } catch (error) {
      this.handleDatabaseError(error, 'updateRelease');
    }
  }

  /**
   * Удаляет релиз
   */
  async deleteRelease(id: number): Promise<void> {
    try {
      // Проверяем, что релиз существует
      await this.checkResourceExists(
        () => this.storage.getRelease(id),
        'Release not found'
      );

      await this.storage.deleteRelease(id);
    } catch (error) {
      this.handleDatabaseError(error, 'deleteRelease');
    }
  }

  /**
   * Ищет релизы
   */
  async searchReleases(query: string, sortBy?: 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc'): Promise<ReleaseWithDetails[]> {
    try {
      if (!query || query.trim().length < 1) {
        throw new ValidationError([{
          field: 'query',
          message: 'Search query is required',
          code: 'REQUIRED'
        }]);
      }

      return await this.storage.searchReleases(query, sortBy);
    } catch (error) {
      this.handleDatabaseError(error, 'searchReleases');
    }
  }

  /**
   * Получает релизы с фильтрами для админки
   */
  async getReleasesWithFilters(filters: AdminReleaseFilters): Promise<{
    releases: ReleaseWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      return await this.storage.getReleasesWithFilters(filters);
    } catch (error) {
      this.handleDatabaseError(error, 'getReleasesWithFilters');
    }
  }

  /**
   * Получает треки релиза
   */
  async getReleaseTracks(releaseId: number): Promise<any[]> {
    try {
      // Проверяем, что релиз существует
      await this.checkResourceExists(
        () => this.storage.getRelease(releaseId),
        'Release not found'
      );

      return await this.storage.getReleaseTracks(releaseId);
    } catch (error) {
      this.handleDatabaseError(error, 'getReleaseTracks');
    }
  }
}
