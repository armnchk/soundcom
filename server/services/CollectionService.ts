import { BaseService } from './BaseService';
import { IStorage } from '../storage';
import { ConflictError, ValidationError } from '../middleware/errorHandler';
import type { InsertCollection, Collection, Release, Artist } from '@shared/schema';

export interface CollectionWithReleases extends Collection {
  releases: (Release & { artist: Artist })[];
}

export interface CreateCollectionData {
  userId: string;
  title: string;
  subtitle?: string;
  description?: string;
  isActive?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
  releaseIds?: number[];
}

export interface UpdateCollectionData {
  title?: string;
  subtitle?: string;
  description?: string;
  isActive?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
  releaseIds?: number[];
}

export class CollectionService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Получает все коллекции
   */
  async getCollections(activeOnly: boolean = true): Promise<CollectionWithReleases[]> {
    try {
      return await this.storage.getCollections(activeOnly);
    } catch (error) {
      this.handleDatabaseError(error, 'getCollections');
    }
  }

  /**
   * Получает коллекцию по ID
   */
  async getCollection(id: number): Promise<CollectionWithReleases> {
    const collection = await this.checkResourceExists(
      () => this.storage.getCollection(id),
      'Collection not found'
    );
    return collection;
  }

  /**
   * Создает новую коллекцию
   */
  async createCollection(data: CreateCollectionData): Promise<CollectionWithReleases> {
    try {
      // Валидируем бизнес-правила
      this.validateBusinessRules([
        () => data.title.trim().length >= 1 || 'Title is required',
        () => data.title.trim().length <= 255 || 'Title too long',
        () => !data.subtitle || data.subtitle.length <= 255 || 'Subtitle too long',
        () => !data.description || data.description.length <= 1000 || 'Description too long',
        () => !data.sortOrder || data.sortOrder >= 0 || 'Sort order must be non-negative'
      ]);

      const collectionData: InsertCollection = {
        user_id: data.userId,
        title: data.title.trim(),
        subtitle: data.subtitle?.trim(),
        description: data.description?.trim(),
        is_active: data.isActive ?? true,
        is_public: data.isPublic ?? true,
        sort_order: data.sortOrder ?? 0
      };

      const collection = await this.storage.createCollection(collectionData);

      // Добавляем релизы, если указаны
      if (data.releaseIds && data.releaseIds.length > 0) {
        for (let i = 0; i < data.releaseIds.length; i++) {
          await this.addReleaseToCollection(collection.id, data.releaseIds[i], i);
        }
      }

      return await this.getCollection(collection.id);
    } catch (error) {
      this.handleDatabaseError(error, 'createCollection');
    }
  }

  /**
   * Обновляет коллекцию
   */
  async updateCollection(id: number, data: UpdateCollectionData): Promise<CollectionWithReleases> {
    try {
      // Проверяем, что коллекция существует
      await this.checkResourceExists(
        () => this.storage.getCollection(id),
        'Collection not found'
      );

      // Если активируется коллекция, проверяем минимальное количество релизов
      if (data.isActive === true) {
        const collection = await this.storage.getCollection(id);
        if (!collection || (collection.releases?.length || 0) < 5) {
          throw new ValidationError([{
            field: 'isActive',
            message: 'Collection must have at least 5 releases to be activated',
            code: 'INSUFFICIENT_RELEASES'
          }]);
        }
      }

      // Валидируем бизнес-правила
      this.validateBusinessRules([
        () => !data.title || data.title.trim().length >= 1 || 'Title is required',
        () => !data.title || data.title.trim().length <= 255 || 'Title too long',
        () => !data.subtitle || data.subtitle.length <= 255 || 'Subtitle too long',
        () => !data.description || data.description.length <= 1000 || 'Description too long',
        () => !data.sortOrder || data.sortOrder >= 0 || 'Sort order must be non-negative'
      ]);

      const updateData: Partial<InsertCollection> = {};
      if (data.title !== undefined) updateData.title = data.title.trim();
      if (data.subtitle !== undefined) updateData.subtitle = data.subtitle?.trim();
      if (data.description !== undefined) updateData.description = data.description?.trim();
      if (data.isActive !== undefined) updateData.is_active = data.isActive;
      if (data.isPublic !== undefined) updateData.is_public = data.isPublic;
      if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

      await this.storage.updateCollection(id, updateData);

      // Обновляем релизы, если указаны
      if (data.releaseIds && Array.isArray(data.releaseIds)) {
        await this.updateCollectionReleases(id, data.releaseIds);
      }

      return await this.getCollection(id);
    } catch (error) {
      this.handleDatabaseError(error, 'updateCollection');
    }
  }

  /**
   * Удаляет коллекцию
   */
  async deleteCollection(id: number): Promise<void> {
    try {
      // Проверяем, что коллекция существует
      await this.checkResourceExists(
        () => this.storage.getCollection(id),
        'Collection not found'
      );

      await this.storage.deleteCollection(id);
    } catch (error) {
      this.handleDatabaseError(error, 'deleteCollection');
    }
  }

  /**
   * Добавляет релиз в коллекцию
   */
  async addReleaseToCollection(collectionId: number, releaseId: number, sortOrder?: number): Promise<any> {
    try {
      // Проверяем, что коллекция существует
      await this.checkResourceExists(
        () => this.storage.getCollection(collectionId),
        'Collection not found'
      );

      // Проверяем, что релиз существует
      await this.checkResourceExists(
        () => this.storage.getRelease(releaseId),
        'Release not found'
      );

      return await this.storage.addReleaseToCollection(collectionId, releaseId, sortOrder);
    } catch (error) {
      this.handleDatabaseError(error, 'addReleaseToCollection');
    }
  }

  /**
   * Удаляет релиз из коллекции
   */
  async removeReleaseFromCollection(collectionId: number, releaseId: number): Promise<void> {
    try {
      // Проверяем, что коллекция существует
      await this.checkResourceExists(
        () => this.storage.getCollection(collectionId),
        'Collection not found'
      );

      await this.storage.removeReleaseFromCollection(collectionId, releaseId);
    } catch (error) {
      this.handleDatabaseError(error, 'removeReleaseFromCollection');
    }
  }

  /**
   * Обновляет порядок релиза в коллекции
   */
  async updateReleaseSortOrder(collectionId: number, releaseId: number, sortOrder: number): Promise<void> {
    try {
      // Проверяем, что коллекция существует
      await this.checkResourceExists(
        () => this.storage.getCollection(collectionId),
        'Collection not found'
      );

      // Валидируем бизнес-правила
      this.validateBusinessRules([
        () => sortOrder >= 0 || 'Sort order must be non-negative'
      ]);

      await this.storage.updateCollectionReleaseSortOrder(collectionId, releaseId, sortOrder);
    } catch (error) {
      this.handleDatabaseError(error, 'updateReleaseSortOrder');
    }
  }

  /**
   * Обновляет релизы в коллекции
   */
  private async updateCollectionReleases(collectionId: number, releaseIds: number[]): Promise<void> {
    try {
      // Удаляем все существующие релизы
      await this.storage.removeAllReleasesFromCollection(collectionId);
      
      // Добавляем новые релизы с правильным порядком
      for (let i = 0; i < releaseIds.length; i++) {
        await this.addReleaseToCollection(collectionId, releaseIds[i], i);
      }
    } catch (error) {
      this.handleDatabaseError(error, 'updateCollectionReleases');
    }
  }

  /**
   * Получает статистику коллекции
   */
  async getCollectionStats(id: number): Promise<{
    totalReleases: number;
    averageRating: number;
    totalComments: number;
  }> {
    try {
      const collection = await this.getCollection(id);
      
      const totalReleases = collection.releases.length;
      const averageRating = totalReleases > 0 
        ? collection.releases.reduce((sum, release) => sum + (release.averageRating || 0), 0) / totalReleases 
        : 0;
      
      const totalComments = collection.releases.reduce((sum, release) => sum + (release.commentCount || 0), 0);

      return {
        totalReleases,
        averageRating: Math.round(averageRating * 10) / 10,
        totalComments
      };
    } catch (error) {
      this.handleDatabaseError(error, 'getCollectionStats');
    }
  }
}
