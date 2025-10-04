import { BaseService } from './BaseService';
import { IStorage } from '../storage';
import { ConflictError, ValidationError } from '../middleware/errorHandler';
import type { InsertComment, Comment, User, Release } from '@shared/schema';

export interface CommentWithDetails extends Comment {
  user: Pick<User, 'id' | 'nickname' | 'profile_image_url'> | null;
  likeCount: number;
  dislikeCount: number;
  userReaction?: 'like' | 'dislike';
}

export interface CreateCommentData {
  userId: string;
  releaseId: number;
  text: string;
  rating: number;
}

export interface UpdateCommentData {
  text?: string;
  rating?: number;
}

export class CommentService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  /**
   * Получает комментарии релиза
   */
  async getComments(releaseId: number, sortBy?: 'date' | 'rating' | 'likes'): Promise<CommentWithDetails[]> {
    try {
      // Проверяем, что релиз существует
      await this.checkResourceExists(
        () => this.storage.getRelease(releaseId),
        'Release not found'
      );

      return await this.storage.getComments(releaseId, sortBy);
    } catch (error) {
      this.handleDatabaseError(error, 'getComments');
    }
  }

  /**
   * Создает комментарий
   */
  async createComment(data: CreateCommentData): Promise<Comment> {
    try {
      // Проверяем, что релиз существует
      await this.checkResourceExists(
        () => this.storage.getRelease(data.releaseId),
        'Release not found'
      );

      // Проверяем, что пользователь еще не комментировал этот релиз
      const existingComment = await this.storage.getUserCommentForRelease(data.userId, data.releaseId);
      if (existingComment) {
        throw new ConflictError('You have already commented on this release. You can only edit your existing comment.');
      }

      // Валидируем бизнес-правила
      this.validateBusinessRules([
        () => data.text.trim().length >= 5 || 'Comment must be at least 5 characters',
        () => data.text.trim().length <= 1000 || 'Comment must be at most 1000 characters',
        () => data.rating >= 1 || 'Rating must be at least 1',
        () => data.rating <= 10 || 'Rating must be at most 10'
      ]);

      const commentData: InsertComment = {
        user_id: data.userId,
        release_id: data.releaseId,
        content: data.text.trim(),
        rating: data.rating
      };

      return await this.storage.createComment(commentData);
    } catch (error) {
      this.handleDatabaseError(error, 'createComment');
    }
  }

  /**
   * Обновляет комментарий
   */
  async updateComment(commentId: number, data: UpdateCommentData): Promise<Comment> {
    try {
      // Проверяем, что комментарий существует
      await this.checkResourceExists(
        () => this.storage.getComments(0).then(comments => 
          comments.find(c => c.id === commentId)
        ),
        'Comment not found'
      );

      // Валидируем бизнес-правила
      this.validateBusinessRules([
        () => !data.text || data.text.trim().length >= 5 || 'Comment must be at least 5 characters',
        () => !data.text || data.text.trim().length <= 1000 || 'Comment must be at most 1000 characters',
        () => !data.rating || data.rating >= 1 || 'Rating must be at least 1',
        () => !data.rating || data.rating <= 10 || 'Rating must be at most 10'
      ]);

      const updateData: Partial<InsertComment> = {};
      if (data.text !== undefined) updateData.content = data.text.trim();
      if (data.rating !== undefined) updateData.rating = data.rating;

      return await this.storage.updateComment(commentId, updateData);
    } catch (error) {
      this.handleDatabaseError(error, 'updateComment');
    }
  }

  /**
   * Удаляет комментарий
   */
  async deleteComment(commentId: number): Promise<void> {
    try {
      // Проверяем, что комментарий существует
      await this.checkResourceExists(
        () => this.storage.getComments(0).then(comments => 
          comments.find(c => c.id === commentId)
        ),
        'Comment not found'
      );

      await this.storage.deleteComment(commentId);
    } catch (error) {
      this.handleDatabaseError(error, 'deleteComment');
    }
  }

  /**
   * Добавляет реакцию на комментарий
   */
  async addReaction(commentId: number, userId: string, reactionType: 'like' | 'dislike'): Promise<any> {
    try {
      // Проверяем, что комментарий существует
      await this.checkResourceExists(
        () => this.storage.getComments(0).then(comments => 
          comments.find(c => c.id === commentId)
        ),
        'Comment not found'
      );

      return await this.storage.upsertCommentReaction({
        commentId,
        userId,
        reactionType
      });
    } catch (error) {
      this.handleDatabaseError(error, 'addReaction');
    }
  }

  /**
   * Удаляет реакцию на комментарий
   */
  async removeReaction(commentId: number, userId: string): Promise<void> {
    try {
      await this.storage.deleteCommentReaction(commentId, userId);
    } catch (error) {
      this.handleDatabaseError(error, 'removeReaction');
    }
  }

  /**
   * Создает жалобу на комментарий
   */
  async reportComment(commentId: number, reportedBy: string, reason: string): Promise<any> {
    try {
      // Проверяем, что комментарий существует
      await this.checkResourceExists(
        () => this.storage.getComments(0).then(comments => 
          comments.find(c => c.id === commentId)
        ),
        'Comment not found'
      );

      // Валидируем бизнес-правила
      this.validateBusinessRules([
        () => reason.trim().length >= 5 || 'Report reason must be at least 5 characters',
        () => reason.trim().length <= 500 || 'Report reason must be at most 500 characters'
      ]);

      return await this.storage.createReport({
        commentId,
        reportedBy,
        reason: reason.trim()
      });
    } catch (error) {
      this.handleDatabaseError(error, 'reportComment');
    }
  }

  /**
   * Получает комментарии пользователя
   */
  async getUserComments(userId: string): Promise<(Comment & { release: Release & { artist: any } })[]> {
    try {
      return await this.storage.getUserComments(userId);
    } catch (error) {
      this.handleDatabaseError(error, 'getUserComments');
    }
  }
}
