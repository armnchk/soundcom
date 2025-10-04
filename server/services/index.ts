import { IStorage } from '../storage';
import { ReleaseService } from './ReleaseService';
import { CommentService } from './CommentService';
import { RatingService } from './RatingService';
import { CollectionService } from './CollectionService';
import { UserService } from './UserService';

export class ServiceContainer {
  public readonly releases: ReleaseService;
  public readonly comments: CommentService;
  public readonly ratings: RatingService;
  public readonly collections: CollectionService;
  public readonly users: UserService;

  constructor(storage: IStorage) {
    this.releases = new ReleaseService(storage);
    this.comments = new CommentService(storage);
    this.ratings = new RatingService(storage);
    this.collections = new CollectionService(storage);
    this.users = new UserService(storage);
  }
}

// Экспорт всех сервисов
export * from './BaseService';
export * from './ReleaseService';
export * from './CommentService';
export * from './RatingService';
export * from './CollectionService';
export * from './UserService';
