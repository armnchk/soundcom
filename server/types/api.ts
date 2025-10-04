import type { 
  User, 
  Artist, 
  Release, 
  Rating, 
  Comment, 
  CommentReaction,
  Report,
  Collection,
  CollectionRelease
} from '@shared/schema';

// Базовые типы для API ответов
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
  timestamp?: string;
  path?: string;
  method?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Типы для релизов
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

// Типы для комментариев
export interface CommentWithDetails extends Comment {
  user: Pick<User, 'id' | 'nickname' | 'profile_image_url'> | null;
  likeCount: number;
  dislikeCount: number;
  userReaction?: 'like' | 'dislike';
}

export interface CreateCommentRequest {
  text: string;
  rating: number;
}

export interface UpdateCommentRequest {
  text?: string;
  rating?: number;
}

// Типы для рейтингов
export interface RatingWithDetails extends Rating {
  release: Release & { artist: Artist };
}

export interface CreateRatingRequest {
  score: number;
}

export interface RatingStats {
  averageRating: number;
  count: number;
}

// Типы для коллекций
export interface CollectionWithReleases extends Collection {
  releases: (Release & { artist: Artist })[];
}

export interface CreateCollectionRequest {
  title: string;
  subtitle?: string;
  description?: string;
  isActive?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
  releaseIds?: number[];
}

export interface UpdateCollectionRequest {
  title?: string;
  subtitle?: string;
  description?: string;
  isActive?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
  releaseIds?: number[];
}

// Типы для пользователей
export interface UserProfile extends User {
  comments: (Comment & { release: Release & { artist: Artist } })[];
  ratings: (Rating & { release: Release & { artist: Artist } })[];
}

export interface CreateUserRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface UpdateUserRequest {
  nickname?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

// Типы для исполнителей
export interface CreateArtistRequest {
  name: string;
  deezer_id?: string;
  itunes_id?: string;
  mts_music_id?: string;
  yandex_music_id?: string;
  yandex_music_url?: string;
  image_url?: string;
  genres?: string[];
  popularity?: number;
  followers?: number;
  total_tracks?: number;
}

export interface UpdateArtistRequest extends Partial<CreateArtistRequest> {}

// Типы для поиска
export interface SearchRequest {
  q: string;
  sortBy?: 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc';
}

export interface SearchResponse {
  releases: ReleaseWithDetails[];
  artists: (Artist & { latestReleaseCover?: string })[];
  total: number;
}

// Типы для импорта
export interface ImportPlaylistRequest {
  playlistUrl: string;
}

export interface ImportStats {
  newArtists: number;
  updatedArtists: number;
  newReleases: number;
  skippedReleases: number;
  errors: string[];
}

// Типы для жалоб
export interface CreateReportRequest {
  reason: string;
}

export interface UpdateReportRequest {
  status: 'pending' | 'resolved';
}

export interface ReportWithDetails extends Report {
  comment: Comment;
  user: User;
}

// Типы для аутентификации
export interface AuthUser {
  id: string;
  google_id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  nickname?: string;
  is_admin?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// Типы для кэширования
export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export interface CacheStats {
  size: number;
  keys: string[];
  memoryUsage: number;
}

// Типы для middleware
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Типы для ошибок
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Типы для валидации
export interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: ValidationError[];
}

// Типы для rate limiting
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

// Типы для CSRF
export interface CSRFConfig {
  secretLength?: number;
  tokenLength?: number;
  cookieName?: string;
  headerName?: string;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  };
}
