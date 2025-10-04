import {
  users,
  artists,
  releases,
  ratings,
  comments,
  commentReactions,
  reports,
  collections,
  collectionReleases,
  autoImportPlaylists,
  importLogs,
  type User,
  type UpsertUser,
  type Artist,
  type Release,
  type Rating,
  type Comment,
  type CommentReaction,
  type Report,
  type Collection,
  type CollectionRelease,
  type SelectAutoImportPlaylist,
  type ImportLog,
  type InsertArtist,
  type InsertRelease,
  type InsertRating,
  type InsertComment,
  type InsertCommentReaction,
  type InsertReport,
  type InsertCollection,
  type InsertCollectionRelease,
  type InsertAutoImportPlaylist,
  type InsertImportLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike, ne } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserNickname(id: string, nickname: string): Promise<User>;
  isNicknameUnique(nickname: string, excludeUserId?: string): Promise<boolean>;

  // Artist operations
  getArtists(): Promise<Artist[]>;
  getArtist(id: number): Promise<Artist | undefined>;
  getArtistByName(name: string): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;
  
  // Release operations
  getReleases(filters?: { genre?: string; year?: number; artistId?: number }): Promise<(Release & { artist: Artist; averageRating: number; commentCount: number })[]>;
  getReleasesByArtist(artistId: number): Promise<(Release & { artist: Artist; averageRating: number; commentCount: number })[]>;
  getRelease(id: number): Promise<(Release & { artist: Artist; averageRating: number; commentCount: number }) | undefined>;
  getReleaseByTitleAndArtist(title: string, artist_id: number): Promise<Release | undefined>;
  getReleaseTracks(releaseId: number): Promise<any[]>;
  createRelease(release: InsertRelease): Promise<Release>;
  updateRelease(id: number, release: Partial<InsertRelease>): Promise<Release>;
  deleteRelease(id: number): Promise<void>;
  searchReleases(query: string, sortBy?: 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc'): Promise<(Release & { artist: Artist; averageRating: number })[]>;
  searchArtists(query: string): Promise<(Artist & { latestReleaseCover?: string })[]>;
  
  // Rating operations
  getRating(user_id: string, release_id: number): Promise<Rating | undefined>;
  upsertRating(rating: InsertRating): Promise<Rating>;
  getReleaseRatings(release_id: number): Promise<{ averageRating: number; count: number }>;
  
  // Comment operations
  getComments(release_id: number, sortBy?: 'date' | 'rating' | 'likes'): Promise<(Comment & { 
    user: Pick<User, 'id' | 'nickname' | 'profile_image_url'> | null;
    likeCount: number;
    dislikeCount: number;
    userReaction?: 'like' | 'dislike';
  })[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment>;
  deleteComment(id: number): Promise<void>;
  getCommentById(id: number): Promise<Comment | null>;
  getUserCommentForRelease(user_id: string, release_id: number): Promise<Comment | null>;
  
  // Comment reaction operations
  upsertCommentReaction(reaction: InsertCommentReaction): Promise<CommentReaction>;
  deleteCommentReaction(commentId: number, user_id: string): Promise<void>;
  
  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getReports(status?: string): Promise<(Report & { comment: Comment; user: Pick<User, 'nickname'> })[]>;
  updateReportStatus(id: number, status: string): Promise<Report>;
  
  // User profile operations
  getUserRatings(user_id: string): Promise<(Rating & { release: Release & { artist: Artist } })[]>;
  getUserComments(user_id: string): Promise<(Comment & { release: Release & { artist: Artist } })[]>;
  
  // Collection operations
  getCollections(activeOnly?: boolean): Promise<(Collection & { releases: (Release & { artist: Artist })[] })[]>;
  getCollection(id: number): Promise<(Collection & { releases: (Release & { artist: Artist })[] }) | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: number, collection: Partial<InsertCollection>): Promise<Collection>;
  deleteCollection(id: number): Promise<void>;
  addReleaseToCollection(collectionId: number, release_id: number, sortOrder?: number): Promise<CollectionRelease>;
  removeReleaseFromCollection(collectionId: number, release_id: number): Promise<void>;
  updateCollectionReleaseSortOrder(collectionId: number, release_id: number, sort_order: number): Promise<void>;
  
  
  // Auto Import Playlists operations
  getAutoImportPlaylists(): Promise<SelectAutoImportPlaylist[]>;
  createAutoImportPlaylist(playlist: InsertAutoImportPlaylist): Promise<SelectAutoImportPlaylist>;
  updateAutoImportPlaylist(id: number, playlist: Partial<InsertAutoImportPlaylist>): Promise<SelectAutoImportPlaylist>;
  deleteAutoImportPlaylist(id: number): Promise<void>;
  
  // Import Logs operations
  createImportLog(log: InsertImportLog): Promise<ImportLog>;
  updateImportLog(id: number, log: Partial<InsertImportLog>): Promise<ImportLog>;
  getImportLogs(limit?: number): Promise<ImportLog[]>;
  getLatestImportLog(): Promise<ImportLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    // Сначала пытаемся найти по google_id (для Google OAuth)
    let [user] = await db.select().from(users).where(eq(users.google_id, id));
    
    // Если не найден по google_id, ищем по обычному id (для совместимости)
    if (!user) {
      [user] = await db.select().from(users).where(eq(users.id, id));
    }
    
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updated_at: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserNickname(id: string, nickname: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ nickname, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async isNicknameUnique(nickname: string, excludeUserId?: string): Promise<boolean> {
    let whereCondition;
    
    if (excludeUserId) {
      // Check if nickname exists for any user except the excluded one
      whereCondition = and(eq(users.nickname, nickname), ne(users.id, excludeUserId));
    } else {
      // Check if nickname exists for any user
      whereCondition = eq(users.nickname, nickname);
    }
    
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(whereCondition)
      .limit(1);
    
    return existingUser.length === 0;
  }

  // Artist operations
  async getArtists(): Promise<Artist[]> {
    return await db.select().from(artists).orderBy(artists.name);
  }

  async getArtist(id: number): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, id));
    return artist;
  }

  async getArtistByName(name: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.name, name));
    return artist;
  }

  async createArtist(artist: InsertArtist): Promise<Artist> {
    const [newArtist] = await db.insert(artists).values(artist).returning();
    return newArtist;
  }

  // Release operations
  async getReleases(filters?: { genre?: string; year?: number; artistId?: number; includeTestData?: boolean }): Promise<(Release & { artist: Artist; averageRating: number; commentCount: number })[]> {
    const whereConditions = [];
    
    // По умолчанию скрываем тестовые данные
    if (!filters?.includeTestData) {
      whereConditions.push(eq(releases.is_test_data, false));
    }
    
    if (filters?.artistId) {
      whereConditions.push(eq(releases.artist_id, filters.artistId));
    }
    
    if (filters?.year) {
      whereConditions.push(sql`EXTRACT(YEAR FROM ${releases.release_date}) = ${filters.year}`);
    }

    let query = db
      .select({
        id: releases.id,
        artistId: releases.artist_id,
        title: releases.title,
        releaseDate: sql`${releases.release_date}`,
        coverUrl: releases.cover_url,
        streamingLinks: releases.streaming_links,
        isTestData: releases.is_test_data,
        createdAt: releases.created_at,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.created_at,
        },
        averageRating: sql<number>`COALESCE(ROUND(AVG(CASE WHEN ${comments.rating} IS NOT NULL THEN ${comments.rating} END), 1), 0)`,
        commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`,
      })
      .from(releases)
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .leftJoin(comments, eq(releases.id, comments.release_id))
      .groupBy(releases.id, artists.id);

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    const result = await query.orderBy(desc(releases.created_at));
    return result as any;
  }

  async getReleasesByArtist(artistId: number): Promise<(Release & { artist: Artist; averageRating: number; commentCount: number })[]> {
    const result = await db
      .select({
        id: releases.id,
        artistId: releases.artist_id,
        title: releases.title,
        releaseDate: sql`${releases.release_date}`,
        coverUrl: releases.cover_url,
        streamingLinks: releases.streaming_links,
        isTestData: releases.is_test_data,
        createdAt: releases.created_at,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.created_at,
        },
        averageRating: sql<number>`COALESCE(ROUND(AVG(CASE WHEN ${comments.rating} IS NOT NULL THEN ${comments.rating} END), 1), 0)`,
        commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`,
      })
      .from(releases)
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .leftJoin(comments, eq(releases.id, comments.release_id))
      .where(and(
        eq(releases.artist_id, artistId),
        eq(releases.is_test_data, false)
      ))
      .groupBy(releases.id, artists.id)
      .orderBy(desc(releases.created_at));

    return result as any;
  }

  async getReleasesWithFilters(params: {
    page: number;
    limit: number;
    search: string;
    type: string;
    artist: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    showTestData: boolean;
  }): Promise<{
    releases: (Release & { artist: Artist; averageRating: number; commentCount: number })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit, search, type, artist, sortBy, sortOrder, showTestData } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    
    if (!showTestData) {
      whereConditions.push(eq(releases.is_test_data, false));
    }

    if (search) {
      whereConditions.push(
        sql`(${releases.title} ILIKE ${`%${search}%`} OR ${artists.name} ILIKE ${`%${search}%`})`
      );
    }

    if (type) {
      whereConditions.push(eq(releases.type, type));
    }

    if (artist) {
      whereConditions.push(ilike(artists.name, `%${artist}%`));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(releases)
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .where(whereClause);

    const [{ count: total }] = await countQuery;

    // Get releases with pagination
    let query = db
      .select({
        id: releases.id,
        artistId: releases.artist_id,
        title: releases.title,
        type: releases.type,
        releaseDate: sql`${releases.release_date}`,
        coverUrl: releases.cover_url,
        streamingLinks: releases.streaming_links,
        deezerId: releases.deezer_id,
        itunesId: releases.itunes_id,
        isTestData: releases.is_test_data,
        createdAt: releases.created_at,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.created_at,
        },
        averageRating: sql<number>`COALESCE(ROUND(AVG(CASE WHEN ${comments.rating} IS NOT NULL THEN ${comments.rating} END), 1), 0)`,
        commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`,
      })
      .from(releases)
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .leftJoin(comments, eq(releases.id, comments.release_id))
      .groupBy(releases.id, artists.id)
      .where(whereClause);

    // Add sorting
    if (sortBy === 'title') {
      query = (sortOrder === 'asc' ? query.orderBy(releases.title) : query.orderBy(desc(releases.title))) as any;
    } else if (sortBy === 'artist') {
      query = (sortOrder === 'asc' ? query.orderBy(artists.name) : query.orderBy(desc(artists.name))) as any;
    } else if (sortBy === 'release_date') {
      query = (sortOrder === 'asc' ? query.orderBy(releases.release_date) : query.orderBy(desc(releases.release_date))) as any;
    } else if (sortBy === 'rating') {
      const ratingColumn = sql`COALESCE(AVG(${ratings.score}), 0)`;
      query = (sortOrder === 'asc' ? query.orderBy(ratingColumn) : query.orderBy(desc(ratingColumn))) as any;
    } else {
      query = (sortOrder === 'asc' ? query.orderBy(releases.created_at) : query.orderBy(desc(releases.created_at))) as any;
    }

    // Add pagination
    query = (query.limit(limit).offset(offset)) as any;

    const releasesResult = await query;

    return {
      releases: releasesResult as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getRelease(id: number): Promise<(Release & { artist: Artist; averageRating: number; commentCount: number }) | undefined> {
    const [result] = await db
      .select({
        id: releases.id,
        artistId: releases.artist_id,
        title: releases.title,
        type: releases.type,
        releaseDate: sql`${releases.release_date}`,
        coverUrl: releases.cover_url,
        streamingLinks: releases.streaming_links,
        deezerId: releases.deezer_id,
        itunesId: releases.itunes_id,
        tracks: releases.tracks,
        isTestData: releases.is_test_data,
        createdAt: releases.created_at,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.created_at,
        },
        averageRating: sql<number>`COALESCE(ROUND(AVG(CASE WHEN ${comments.rating} IS NOT NULL THEN ${comments.rating} END), 1), 0)`,
        commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`,
      })
      .from(releases)
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .leftJoin(comments, eq(releases.id, comments.release_id))
      .where(eq(releases.id, id))
      .groupBy(releases.id, artists.id);

    return result as any;
  }

  async getReleaseByTitleAndArtist(title: string, artist_id: number): Promise<Release | undefined> {
    const [release] = await db
      .select()
      .from(releases)
      .where(and(eq(releases.title, title), eq(releases.artist_id, artist_id)));
    return release;
  }

  async createRelease(release: InsertRelease): Promise<Release> {
    const [newRelease] = await db.insert(releases).values(release).returning();
    return newRelease;
  }

  async updateRelease(id: number, release: Partial<InsertRelease>): Promise<Release> {
    const [updatedRelease] = await db
      .update(releases)
      .set(release)
      .where(eq(releases.id, id))
      .returning();
    return updatedRelease;
  }

  async deleteRelease(id: number): Promise<void> {
    await db.delete(releases).where(eq(releases.id, id));
  }

  async searchReleases(query: string, sortBy?: 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc'): Promise<(Release & { artist: Artist; averageRating: number })[]> {
    // First, get the average ratings for each release
    const ratingsSubquery = db
      .select({
        release_id: ratings.release_id,
        averageRating: sql<number>`COALESCE(ROUND(AVG(${ratings.score}), 1), 0)`.as('averageRating')
      })
      .from(ratings)
      .groupBy(ratings.release_id)
      .as('release_ratings');

    // Build the main query
    let orderByClause;
    
    if (sortBy === 'date_desc') {
      orderByClause = [desc(releases.release_date), desc(releases.created_at)];
    } else if (sortBy === 'date_asc') {
      orderByClause = [releases.release_date, releases.created_at];
    } else if (sortBy === 'rating_desc') {
      orderByClause = [desc(ratingsSubquery.averageRating)];
    } else if (sortBy === 'rating_asc') {
      orderByClause = [ratingsSubquery.averageRating];
    } else {
      // Default sorting by relevance (no specific order)
      orderByClause = [desc(releases.created_at)];
    }

    const result = await db
      .select({
        id: releases.id,
        artistId: releases.artist_id,
        title: releases.title,
        type: releases.type,
        releaseDate: sql`${releases.release_date}`,
        coverUrl: releases.cover_url,
        streamingLinks: releases.streaming_links,
        deezerId: releases.deezer_id,
        itunesId: releases.itunes_id,
        tracks: releases.tracks,
        createdAt: releases.created_at,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.created_at,
        },
        averageRating: sql<number>`COALESCE(${ratingsSubquery.averageRating}, 0)`.as('averageRating'),
      })
      .from(releases)
      .innerJoin(artists, eq(releases.artist_id, artists.id))
      .leftJoin(ratingsSubquery, eq(releases.id, ratingsSubquery.release_id))
      .where(
        or(
          ilike(releases.title, `%${query}%`),
          ilike(artists.name, `%${query}%`)
        )
      )
      .orderBy(...orderByClause);

    return result as any;
  }

  async searchArtists(query: string): Promise<(Artist & { latestReleaseCover?: string })[]> {
    const result = await db
      .select({
        id: artists.id,
        name: artists.name,
        created_at: artists.created_at,
        latestReleaseCover: sql<string>`(
          SELECT r.cover_url 
          FROM releases r 
          WHERE r.artist_id = artists.id 
          ORDER BY r.release_date DESC, r.created_at DESC 
          LIMIT 1
        )`.as('latestReleaseCover'),
      })
      .from(artists)
      .where(ilike(artists.name, `%${query}%`));

    return result as (Artist & { latestReleaseCover?: string })[];
  }

  // Rating operations
  async getRating(user_id: string, release_id: number): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.user_id, user_id), eq(ratings.release_id, release_id)));
    return rating;
  }

  async upsertRating(rating: InsertRating): Promise<Rating> {
    const [result] = await db
      .insert(ratings)
      .values(rating)
      .onConflictDoUpdate({
        target: [ratings.user_id, ratings.release_id],
        set: {
          score: rating.score,
          updated_at: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getReleaseRatings(release_id: number): Promise<{ averageRating: number; count: number }> {
    const [result] = await db
      .select({
        averageRating: sql<number>`COALESCE(ROUND(AVG(${comments.rating}), 1), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(comments)
      .where(and(
        eq(comments.release_id, release_id),
        ne(comments.rating, null)
      ));

    return {
      averageRating: Number(result?.averageRating) || 0,
      count: Number(result?.count) || 0
    };
  }

  // Comment operations
  async getComments(release_id: number, sortBy: 'date' | 'rating' | 'likes' = 'date'): Promise<any[]> {
    try {
      console.log('Getting comments for release_id:', release_id);
      
      // Get comments with user information and reaction counts
      const result = await db
        .select({
          id: comments.id,
          user_id: comments.user_id,
          release_id: comments.release_id,
          content: comments.content,
          rating: comments.rating,
          parent_id: comments.parent_id,
          created_at: comments.created_at,
          updated_at: comments.updated_at,
          user: {
            id: users.id,
            nickname: users.nickname,
            profile_image_url: users.profile_image_url,
          },
          likeCount: sql<number>`COALESCE(SUM(CASE WHEN ${commentReactions.reaction_type} = 'like' THEN 1 ELSE 0 END), 0)`,
          dislikeCount: sql<number>`COALESCE(SUM(CASE WHEN ${commentReactions.reaction_type} = 'dislike' THEN 1 ELSE 0 END), 0)`,
        })
        .from(comments)
        .leftJoin(users, eq(comments.user_id, users.id))
        .leftJoin(commentReactions, eq(comments.id, commentReactions.comment_id))
        .where(eq(comments.release_id, release_id))
        .groupBy(comments.id, users.id)
        .orderBy(desc(comments.created_at));

      console.log('Comments query result:', result.length, 'comments found');

      // Map to expected format
      const commentsWithCounts = result.map(comment => ({
        ...comment,
        text: comment.content, // Map content to text for compatibility
        is_anonymous: false, // No anonymous flag in current schema
        user: comment.user?.id ? comment.user : null, // Only include user if exists
      }));

      return commentsWithCounts;
    } catch (error) {
      console.error('Error in getComments:', error);
      throw error;
    }
  }

  async getReleaseTracks(releaseId: number): Promise<any[]> {
    const result = await db
      .select({
        tracks: releases.tracks,
      })
      .from(releases)
      .where(eq(releases.id, releaseId));

    return (result[0] as any)?.tracks || [];
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    // Map the comment data to match the actual database schema
    const commentData = {
      user_id: comment.user_id,
      release_id: comment.release_id,
      content: comment.text || comment.content,
      rating: comment.rating || null,
      parent_id: comment.parent_id || null,
    };
    
    const [newComment] = await db.insert(comments).values(commentData).returning() as any;
    
    // Map back to expected format
    return {
      ...newComment,
      text: newComment.content,
      rating: newComment.rating,
      is_anonymous: false,
    } as Comment;
  }

  async updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment> {
    // Map the comment data to match the actual database schema
    const updateData: any = {
      updated_at: new Date()
    };
    
    if (comment.text !== undefined) {
      updateData.content = comment.text;
    }
    if (comment.rating !== undefined) {
      updateData.rating = comment.rating;
    }
    if (comment.user_id !== undefined) {
      updateData.user_id = comment.user_id;
    }
    if (comment.release_id !== undefined) {
      updateData.release_id = comment.release_id;
    }
    if (comment.parent_id !== undefined) {
      updateData.parent_id = comment.parent_id;
    }
    
    const [updatedComment] = await db
      .update(comments)
      .set(updateData)
      .where(eq(comments.id, id))
      .returning();
    
    // Map back to expected format
    return {
      ...updatedComment,
      text: updatedComment.content,
      rating: updatedComment.rating,
      is_anonymous: false,
    } as Comment;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  async getUserCommentForRelease(user_id: string, release_id: number): Promise<Comment | null> {
    const [result] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.user_id, user_id), eq(comments.release_id, release_id)))
      .limit(1);
    
    if (!result) return null;
    
    // Map back to expected format
    return {
      ...result,
      text: result.content,
      rating: result.rating,
      is_anonymous: false,
    } as Comment;
  }

  async getCommentById(id: number): Promise<Comment | null> {
    const [result] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id))
      .limit(1);
    
    if (!result) return null;
    
    // Map back to expected format
    return {
      ...result,
      text: result.content,
      rating: result.rating,
      is_anonymous: false,
    } as Comment;
  }

  // Comment reaction operations
  async upsertCommentReaction(reaction: InsertCommentReaction): Promise<CommentReaction> {
    const [result] = await db
      .insert(commentReactions)
      .values(reaction)
      .onConflictDoUpdate({
        target: [commentReactions.comment_id, commentReactions.user_id],
        set: {
          reaction_type: reaction.reaction_type,
        },
      })
      .returning();
    return result;
  }

  async deleteCommentReaction(commentId: number, user_id: string): Promise<void> {
    await db
      .delete(commentReactions)
      .where(and(eq(commentReactions.comment_id, commentId), eq(commentReactions.user_id, user_id)));
  }

  // Report operations
  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async getReports(status?: string): Promise<(Report & { comment: Comment; user: Pick<User, 'nickname'> })[]> {
    let query = db
      .select({
        id: reports.id,
        comment_id: reports.comment_id,
        reported_by: reports.reported_by,
        reason: reports.reason,
        status: reports.status,
        created_at: reports.created_at,
        comment: {
          id: comments.id,
          user_id: comments.user_id,
          release_id: comments.release_id,
          text: comments.content,
          rating: sql`null`,
          is_anonymous: sql`false`,
          created_at: comments.created_at,
          updated_at: comments.updated_at,
        },
        user: {
          nickname: users.nickname,
        },
      })
      .from(reports)
      .leftJoin(comments, eq(reports.comment_id, comments.id))
      .leftJoin(users, eq(reports.reported_by, users.id));

    if (status) {
      query = query.where(eq(reports.status, status)) as any;
    }

    const result = await query.orderBy(desc(reports.created_at));
    return result as (Report & { comment: Comment; user: Pick<User, 'nickname'> })[];
  }

  async updateReportStatus(id: number, status: string): Promise<Report> {
    const [updatedReport] = await db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, id))
      .returning();
    return updatedReport;
  }

  // User profile operations
  async getUserRatings(user_id: string): Promise<(Rating & { release: Release & { artist: Artist } })[]> {
    const result = await db
      .select({
        id: comments.id,
        user_id: comments.user_id,
        release_id: comments.release_id,
        score: comments.rating,
        createdAt: comments.created_at,
        updatedAt: comments.updated_at,
        release: {
          id: releases.id,
          artistId: releases.artist_id,
          title: releases.title,
          type: releases.type,
          releaseDate: sql`${releases.release_date}`,
          coverUrl: releases.cover_url,
          streamingLinks: releases.streaming_links,
          isTestData: releases.is_test_data,
          createdAt: releases.created_at,
        },
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.created_at,
        },
      })
      .from(comments)
      .leftJoin(releases, eq(comments.release_id, releases.id))
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .where(and(
        eq(comments.user_id, user_id),
        sql`${comments.rating} IS NOT NULL`
      ))
      .orderBy(desc(comments.created_at));

    return result as any;
  }

  async getUserComments(user_id: string): Promise<(Comment & { release: Release & { artist: Artist } })[]> {
    const result = await db
      .select({
        id: comments.id,
        user_id: comments.user_id,
        release_id: comments.release_id,
        text: comments.content,
        rating: sql`null`,
        is_anonymous: sql`false`,
        createdAt: comments.created_at,
        updatedAt: comments.updated_at,
        release: {
          id: releases.id,
          artistId: releases.artist_id,
          title: releases.title,
          type: releases.type,
          releaseDate: sql`${releases.release_date}`,
          coverUrl: releases.cover_url,
          streamingLinks: releases.streaming_links,
          isTestData: releases.is_test_data,
          createdAt: releases.created_at,
        },
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.created_at,
        },
      })
      .from(comments)
      .leftJoin(releases, eq(comments.release_id, releases.id))
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .where(eq(comments.user_id, user_id))
      .orderBy(desc(comments.created_at));

    return result as any;
  }

  // Collection operations
  async getCollections(activeOnly = true): Promise<(Collection & { releases: (Release & { artist: Artist })[] })[]> {
    const query = db
      .select({
        collection: collections,
        release: releases,
        artist: artists,
        sort_order: collectionReleases.sort_order,
      })
      .from(collections)
      .leftJoin(collectionReleases, eq(collections.id, collectionReleases.collection_id))
      .leftJoin(releases, eq(collectionReleases.release_id, releases.id))
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .orderBy(collections.sort_order, collectionReleases.sort_order);

    if (activeOnly) {
      query.where(eq(collections.is_active, true));
    }

    const result = await query;
    
    // Group by collection
    const collectionsMap = new Map<number, Collection & { releases: (Release & { artist: Artist })[] }>();
    
    for (const row of result) {
      if (!collectionsMap.has(row.collection.id)) {
        collectionsMap.set(row.collection.id, {
          ...(row.collection as any),
          releases: []
        });
      }
      
      if (row.release && row.artist) {
        collectionsMap.get(row.collection.id)!.releases.push({
          ...(row.release as any),
          coverUrl: (row.release as any).cover_url || null,
          artist: row.artist
        });
      }
    }
    
    return Array.from(collectionsMap.values());
  }

  async getCollection(id: number): Promise<(Collection & { releases: (Release & { artist: Artist })[] }) | undefined> {
    const result = await db
      .select({
        collection: collections,
        release: releases,
        artist: artists,
        sort_order: collectionReleases.sort_order,
      })
      .from(collections)
      .leftJoin(collectionReleases, eq(collections.id, collectionReleases.collection_id))
      .leftJoin(releases, eq(collectionReleases.release_id, releases.id))
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .where(eq(collections.id, id))
      .orderBy(collectionReleases.sort_order);

    if (result.length === 0) return undefined;

    const collectionData = result[0].collection;
    const releasesData = result
      .filter(row => row.release && row.artist)
      .map(row => ({
        ...row.release!,
        coverUrl: row.release!.cover_url || null,
        artist: row.artist!
      }));

    return {
      ...collectionData,
      releases: releasesData
    };
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    console.log("Storage: Creating collection with data:", collection);
    try {
      const [created] = await db
        .insert(collections)
        .values(collection)
        .returning();
      console.log("Storage: Collection created successfully:", created);
      return created;
    } catch (error) {
      console.error("Storage: Error creating collection:", error);
      throw error;
    }
  }

  async updateCollection(id: number, collection: Partial<InsertCollection>): Promise<Collection> {
    const [updated] = await db
      .update(collections)
      .set({ ...collection, updated_at: new Date() })
      .where(eq(collections.id, id))
      .returning();
    return updated;
  }

  async deleteCollection(id: number): Promise<void> {
    await db.delete(collections).where(eq(collections.id, id));
  }

  async addReleaseToCollection(collectionId: number, release_id: number, sortOrder = 0): Promise<CollectionRelease> {
    const [created] = await db
      .insert(collectionReleases)
      .values({ collection_id: collectionId, release_id, sort_order: sortOrder })
      .returning();
    return created;
  }

  async removeReleaseFromCollection(collectionId: number, release_id: number): Promise<void> {
    await db
      .delete(collectionReleases)
      .where(and(
        eq(collectionReleases.collection_id, collectionId),
        eq(collectionReleases.release_id, release_id)
      ));
  }

  async removeAllReleasesFromCollection(collectionId: number): Promise<void> {
    await db
      .delete(collectionReleases)
      .where(eq(collectionReleases.collection_id, collectionId));
  }

  async updateCollectionReleaseSortOrder(collectionId: number, release_id: number, sort_order: number): Promise<void> {
    await db
      .update(collectionReleases)
      .set({ sort_order })
      .where(and(
        eq(collectionReleases.collection_id, collectionId),
        eq(collectionReleases.release_id, release_id)
      ));
  }


  // Auto Import Playlists operations
  async getAutoImportPlaylists(): Promise<SelectAutoImportPlaylist[]> {
    return await db.select().from(autoImportPlaylists).orderBy(autoImportPlaylists.sort_order, autoImportPlaylists.created_at);
  }

  async createAutoImportPlaylist(playlist: InsertAutoImportPlaylist): Promise<SelectAutoImportPlaylist> {
    const [created] = await db.insert(autoImportPlaylists).values(playlist).returning();
    return created;
  }

  async updateAutoImportPlaylist(id: number, playlist: Partial<InsertAutoImportPlaylist>): Promise<SelectAutoImportPlaylist> {
    const [updated] = await db
      .update(autoImportPlaylists)
      .set({ ...playlist, updated_at: new Date() })
      .where(eq(autoImportPlaylists.id, id))
      .returning();
    return updated;
  }

  async deleteAutoImportPlaylist(id: number): Promise<void> {
    await db.delete(autoImportPlaylists).where(eq(autoImportPlaylists.id, id));
  }

  // Import Logs operations
  async createImportLog(log: InsertImportLog): Promise<ImportLog> {
    const [created] = await db.insert(importLogs).values(log).returning();
    return created;
  }

  async updateImportLog(id: number, log: Partial<InsertImportLog>): Promise<ImportLog> {
    const [updated] = await db
      .update(importLogs)
      .set(log)
      .where(eq(importLogs.id, id))
      .returning();
    return updated;
  }

  async getImportLogs(limit: number = 20): Promise<ImportLog[]> {
    return db
      .select()
      .from(importLogs)
      .orderBy(desc(importLogs.created_at))
      .limit(limit);
  }

  async getLatestImportLog(): Promise<ImportLog | undefined> {
    const [latest] = await db
      .select()
      .from(importLogs)
      .orderBy(desc(importLogs.created_at))
      .limit(1);
    return latest;
  }

  // Import Statistics
  async getImportStats(): Promise<{
    totalArtists: number;
    totalReleases: number;
    artistsWithDeezer: number;
    recentReleases: number;
  }> {
    const [totalArtists] = await db
      .select({ count: sql<number>`count(*)` })
      .from(artists);
    
    const [totalReleases] = await db
      .select({ count: sql<number>`count(*)` })
      .from(releases);
    
    const [artistsWithDeezer] = await db
      .select({ count: sql<number>`count(*)` })
      .from(artists)
      .where(sql`deezer_id IS NOT NULL AND deezer_id != ''`);
    
    const [recentReleases] = await db
      .select({ count: sql<number>`count(*)` })
      .from(releases)
      .where(sql`created_at >= NOW() - INTERVAL '7 days'`);

    return {
      totalArtists: totalArtists.count,
      totalReleases: totalReleases.count,
      artistsWithDeezer: artistsWithDeezer.count,
      recentReleases: recentReleases.count,
    };
  }

}

export const storage = new DatabaseStorage();
