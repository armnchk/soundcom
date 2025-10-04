import { z } from 'zod';
import { securityLogger } from '../lib/securityLogger';

// Базовые схемы
export const idSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a positive integer').transform(Number)
});

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).default('50')
});

export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Search query too long')
});

// Схемы для пользователей
export const nicknameSchema = z.object({
  nickname: z.string()
    .min(3, 'Nickname must be at least 3 characters')
    .max(20, 'Nickname must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Nickname can only contain letters, numbers and underscores')
});

// Схемы для исполнителей
export const createArtistSchema = z.object({
  name: z.string()
    .min(1, 'Artist name is required')
    .max(255, 'Artist name too long')
    .trim(),
  deezer_id: z.string().optional(),
  itunes_id: z.string().optional(),
  mts_music_id: z.string().optional(),
  yandex_music_id: z.string().optional(),
  yandex_music_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  genres: z.array(z.string()).optional(),
  popularity: z.number().int().min(0).max(100).optional(),
  followers: z.number().int().min(0).optional(),
  total_tracks: z.number().int().min(0).optional()
});

export const updateArtistSchema = createArtistSchema.partial();

// Схемы для релизов
export const createReleaseSchema = z.object({
  artist_id: z.number().int().positive('Artist ID must be positive'),
  title: z.string()
    .min(1, 'Release title is required')
    .max(255, 'Release title too long')
    .trim(),
  type: z.enum(['album', 'single', 'compilation']).default('album'),
  release_date: z.string().datetime().optional(),
  cover_url: z.string().url().optional(),
  cover_small: z.string().url().optional(),
  cover_medium: z.string().url().optional(),
  cover_big: z.string().url().optional(),
  cover_xl: z.string().url().optional(),
  streaming_links: z.record(z.string()).optional(),
  deezer_id: z.string().optional(),
  itunes_id: z.string().optional(),
  yandex_music_id: z.string().optional(),
  yandex_music_url: z.string().url().optional(),
  total_tracks: z.number().int().min(0).optional(),
  duration: z.number().int().min(0).optional(),
  explicit_lyrics: z.boolean().default(false),
  explicit_content_lyrics: z.number().int().min(0).max(4).default(0),
  explicit_content_cover: z.number().int().min(0).max(4).default(0),
  genres: z.array(z.string()).optional(),
  upc: z.string().max(50).optional(),
  label: z.string().max(255).optional(),
  contributors: z.record(z.any()).optional(),
  tracks: z.array(z.any()).optional(),
  is_test_data: z.boolean().default(false)
});

export const updateReleaseSchema = createReleaseSchema.partial();

export const releaseFiltersSchema = z.object({
  genre: z.string().optional(),
  year: z.string().regex(/^\d{4}$/, 'Year must be 4 digits').transform(Number).optional(),
  artistId: z.string().regex(/^\d+$/, 'Artist ID must be a positive integer').transform(Number).optional(),
  includeTestData: z.string().transform(val => val === 'true').optional()
});

export const adminReleaseFiltersSchema = paginationSchema.extend({
  search: z.string().default(''),
  type: z.string().default(''),
  artist: z.string().default(''),
  sortBy: z.enum(['created_at', 'title', 'artist', 'release_date', 'rating']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  showTestData: z.string().transform(val => val === 'true').default('false')
});

// Схемы для рейтингов
export const createRatingSchema = z.object({
  score: z.number()
    .int('Score must be an integer')
    .min(1, 'Score must be at least 1')
    .max(10, 'Score must be at most 10')
});

export const ratingQuerySchema = z.object({
  sortBy: z.enum(['date_desc', 'date_asc', 'rating_desc', 'rating_asc']).optional()
});

// Схемы для комментариев
export const createCommentSchema = z.object({
  text: z.string()
    .min(5, 'Comment must be at least 5 characters')
    .max(1000, 'Comment must be at most 1000 characters')
    .trim()
    .refine((text, ctx) => {
      // Проверяем на потенциально опасные паттерны
      const dangerousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>.*?<\/embed>/gi,
        /<link[^>]*>.*?<\/link>/gi,
        /<style[^>]*>.*?<\/style>/gi,
        /<form[^>]*>.*?<\/form>/gi,
        /<input[^>]*>.*?<\/input>/gi,
        /<button[^>]*>.*?<\/button>/gi,
      ];
      
      const isDangerous = dangerousPatterns.some(pattern => pattern.test(text));
      
      if (isDangerous) {
        // Логируем попытку XSS атаки
        const req = ctx.path[0] as any; // Получаем request из контекста
        if (req?.ip) {
          securityLogger.logXSSAttempt(
            req.ip,
            text,
            req.url || 'unknown',
            req.get('User-Agent'),
            req.user?.claims?.sub
          );
        }
      }
      
      return !isDangerous;
    }, 'Comment contains potentially dangerous content'),
  rating: z.number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(10, 'Rating must be at most 10')
});

export const updateCommentSchema = createCommentSchema.partial();

export const commentQuerySchema = z.object({
  sortBy: z.enum(['date', 'rating', 'likes']).optional()
});

// Схемы для реакций на комментарии
export const createReactionSchema = z.object({
  reactionType: z.enum(['like', 'dislike'], {
    errorMap: () => ({ message: 'Reaction type must be "like" or "dislike"' })
  })
});

// Схемы для жалоб
export const createReportSchema = z.object({
  reason: z.string()
    .min(5, 'Report reason must be at least 5 characters')
    .max(500, 'Report reason must be at most 500 characters')
    .trim()
});

export const updateReportSchema = z.object({
  status: z.enum(['pending', 'resolved'], {
    errorMap: () => ({ message: 'Status must be "pending" or "resolved"' })
  })
});

// Схемы для коллекций
export const createCollectionSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  title: z.string()
    .min(1, 'Collection title is required')
    .max(255, 'Collection title too long')
    .trim(),
  subtitle: z.string().max(255, 'Subtitle too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  is_active: z.boolean().default(true),
  is_public: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
  releaseIds: z.array(z.number().int().positive()).optional()
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const collectionReleaseSchema = z.object({
  releaseId: z.number().int().positive('Release ID must be positive'),
  sortOrder: z.number().int().min(0).optional()
});

// Схемы для импорта
export const importPlaylistSchema = z.object({
  playlistUrl: z.string()
    .url('Playlist URL must be a valid URL')
    .min(1, 'Playlist URL is required')
});

export const createAutoImportPlaylistSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  url: z.string()
    .url('URL must be a valid URL')
    .min(1, 'URL is required'),
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name too long')
    .trim(),
  description: z.string().max(500, 'Description too long').optional(),
  enabled: z.boolean().default(true),
  platform: z.enum(['mts', 'yandex', 'deezer', 'itunes']).default('mts'),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0)
});

export const updateAutoImportPlaylistSchema = createAutoImportPlaylistSchema.partial();

// Схемы для миграций
export const migrationSchema = z.object({
  action: z.enum(['add_fields', 'remove_fields', 'clean_releases', 'clear_cache'])
});

// User schemas
export const userIdSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const userRatingsQuerySchema = z.object({
  search: z.string().optional(),
  artist: z.string().optional(),
  release: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'rating_high', 'rating_low']).optional(),
  withComments: z.enum(['true', 'false']).optional(),
});

export const userCommentsQuerySchema = z.object({
  search: z.string().optional(),
  artist: z.string().optional(),
  release: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'likes_high', 'likes_low']).optional(),
});

// Экспорт всех схем для удобства
export const schemas = {
  id: idSchema,
  pagination: paginationSchema,
  search: searchSchema,
  nickname: nicknameSchema,
  createArtist: createArtistSchema,
  updateArtist: updateArtistSchema,
  createRelease: createReleaseSchema,
  updateRelease: updateReleaseSchema,
  releaseFilters: releaseFiltersSchema,
  adminReleaseFilters: adminReleaseFiltersSchema,
  createRating: createRatingSchema,
  ratingQuery: ratingQuerySchema,
  createComment: createCommentSchema,
  updateComment: updateCommentSchema,
  commentQuery: commentQuerySchema,
  createReaction: createReactionSchema,
  createReport: createReportSchema,
  updateReport: updateReportSchema,
  createCollection: createCollectionSchema,
  updateCollection: updateCollectionSchema,
  collectionRelease: collectionReleaseSchema,
  importPlaylist: importPlaylistSchema,
  createAutoImportPlaylist: createAutoImportPlaylistSchema,
  updateAutoImportPlaylist: updateAutoImportPlaylistSchema,
  migration: migrationSchema,
  userId: userIdSchema,
  userRatingsQuery: userRatingsQuerySchema,
  userCommentsQuery: userCommentsQuerySchema
};
