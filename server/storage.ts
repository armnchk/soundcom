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
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserNickname(id: string, nickname: string): Promise<User>;

  // Artist operations
  getArtists(): Promise<Artist[]>;
  getArtist(id: number): Promise<Artist | undefined>;
  getArtistByName(name: string): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;
  
  // Release operations
  getReleases(filters?: { genre?: string; year?: number; artistId?: number }): Promise<(Release & { artist: Artist; averageRating: number; commentCount: number })[]>;
  getRelease(id: number): Promise<(Release & { artist: Artist; averageRating: number; commentCount: number }) | undefined>;
  getReleaseByTitleAndArtist(title: string, artist_id: number): Promise<Release | undefined>;
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
    user: Pick<User, 'id' | 'nickname' | 'profileImageUrl'> | null;
    likeCount: number;
    dislikeCount: number;
    userReaction?: 'like' | 'dislike';
  })[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment>;
  deleteComment(id: number): Promise<void>;
  
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
        releaseDate: releases.release_date,
        coverUrl: releases.cover_url,
        streamingLinks: releases.streaming_links,
        isTestData: releases.is_test_data,
        createdAt: releases.created_at,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.created_at,
        },
        averageRating: sql<number>`COALESCE(AVG(${ratings.score}), 0)`,
        commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`,
      })
      .from(releases)
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .leftJoin(ratings, eq(releases.id, ratings.release_id))
      .leftJoin(comments, eq(releases.id, comments.release_id))
      .groupBy(releases.id, artists.id);

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    const result = await query.orderBy(desc(releases.created_at));
    return result as (Release & { artist: Artist; averageRating: number; commentCount: number })[];
  }

  async getRelease(id: number): Promise<(Release & { artist: Artist; averageRating: number; commentCount: number }) | undefined> {
    const [result] = await db
      .select({
        id: releases.id,
        artistId: releases.artist_id,
        title: releases.title,
        releaseDate: releases.release_date,
        coverUrl: releases.cover_url,
        streamingLinks: releases.streaming_links,
        isTestData: releases.is_test_data,
        createdAt: releases.created_at,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.created_at,
        },
        averageRating: sql<number>`COALESCE(AVG(${ratings.score}), 0)`,
        commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`,
      })
      .from(releases)
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .leftJoin(ratings, eq(releases.id, ratings.release_id))
      .leftJoin(comments, eq(releases.id, comments.release_id))
      .where(eq(releases.id, id))
      .groupBy(releases.id, artists.id);

    return result as (Release & { artist: Artist; averageRating: number; commentCount: number }) | undefined;
  }

  async getReleaseByTitleAndArtist(title: string, artist_id: number): Promise<Release | undefined> {
    const [release] = await db
      .select()
      .from(releases)
      .where(and(eq(releases.title, title), eq(releases.artist_id, artistId)));
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
    // Build the base query with groupBy and orderBy in the correct order
    let orderByClause;
    
    if (sortBy === 'date_desc') {
      orderByClause = [desc(releases.release_date), desc(releases.created_at)];
    } else if (sortBy === 'date_asc') {
      orderByClause = [releases.release_date, releases.created_at];
    } else if (sortBy === 'rating_desc') {
      orderByClause = [desc(sql`COALESCE(AVG(${ratings.score}), 0)`)];
    } else if (sortBy === 'rating_asc') {
      orderByClause = [sql`COALESCE(AVG(${ratings.score}), 0)`];
    } else {
      // Default sorting by relevance (no specific order)
      orderByClause = [desc(releases.created_at)];
    }

    const result = await db
      .select({
        id: releases.id,
        artistId: releases.artist_id,
        title: releases.title,
        releaseDate: releases.release_date,
        coverUrl: releases.cover_url,
        streamingLinks: releases.streaming_links,
        createdAt: releases.created_at,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.created_at,
        },
        averageRating: sql<number>`COALESCE(AVG(${ratings.score}), 0)`.as('averageRating'),
      })
      .from(releases)
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .leftJoin(ratings, eq(ratings.release_id, releases.id))
      .where(
        or(
          ilike(releases.title, `%${query}%`),
          ilike(artists.name, `%${query}%`)
        )
      )
      .groupBy(releases.id, artists.id)
      .orderBy(...orderByClause);

    return result as (Release & { artist: Artist; averageRating: number })[];
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
        averageRating: sql<number>`COALESCE(AVG(${ratings.score}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(ratings)
      .where(eq(ratings.release_id, release_id));

    return result || { averageRating: 0, count: 0 };
  }

  // Comment operations
  async getComments(release_id: number, sortBy: 'date' | 'rating' | 'likes' = 'date'): Promise<(Comment & { 
    user: Pick<User, 'id' | 'nickname' | 'profileImageUrl'> | null;
    likeCount: number;
    dislikeCount: number;
    userReaction?: 'like' | 'dislike';
  })[]> {
    let orderBy;
    switch (sortBy) {
      case 'rating':
        orderBy = desc(comments.rating);
        break;
      case 'likes':
        orderBy = sql`like_count DESC`;
        break;
      default:
        orderBy = desc(comments.created_at);
    }

    const result = await db
      .select({
        id: comments.id,
        user_id: comments.user_id,
        release_id: comments.release_id,
        text: comments.text,
        rating: comments.rating,
        is_anonymous: comments.is_anonymous,
        createdAt: comments.created_at,
        updatedAt: comments.updated_at,
        user: {
          id: users.id,
          nickname: users.nickname,
          profileImageUrl: users.profile_image_url,
        },
        likeCount: sql<number>`COUNT(CASE WHEN ${commentReactions.reactionType} = 'like' THEN 1 END)`,
        dislikeCount: sql<number>`COUNT(CASE WHEN ${commentReactions.reactionType} = 'dislike' THEN 1 END)`,
      })
      .from(comments)
      .leftJoin(users, and(eq(comments.user_id, users.id), eq(comments.is_anonymous, false)))
      .leftJoin(commentReactions, eq(comments.id, commentReactions.commentId))
      .where(eq(comments.release_id, release_id))
      .groupBy(comments.id, comments.user_id, comments.release_id, comments.text, comments.rating, comments.is_anonymous, comments.created_at, comments.updated_at, users.id, users.nickname, users.profile_image_url)
      .orderBy(orderBy);

    return result as (Comment & { 
      user: Pick<User, 'id' | 'nickname' | 'profileImageUrl'> | null;
      likeCount: number;
      dislikeCount: number;
    })[];
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment> {
    const [updatedComment] = await db
      .update(comments)
      .set({ ...comment, updated_at: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return updatedComment;
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
    return result || null;
  }

  // Comment reaction operations
  async upsertCommentReaction(reaction: InsertCommentReaction): Promise<CommentReaction> {
    const [result] = await db
      .insert(commentReactions)
      .values(reaction)
      .onConflictDoUpdate({
        target: [commentReactions.commentId, commentReactions.user_id],
        set: {
          reactionType: reaction.reactionType,
        },
      })
      .returning();
    return result;
  }

  async deleteCommentReaction(commentId: number, user_id: string): Promise<void> {
    await db
      .delete(commentReactions)
      .where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.user_id, user_id)));
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
        commentId: reports.commentId,
        reportedBy: reports.reportedBy,
        reason: reports.reason,
        status: reports.status,
        created_at: reports.created_at,
        comment: {
          id: comments.id,
          user_id: comments.user_id,
          release_id: comments.release_id,
          text: comments.text,
          rating: comments.rating,
          is_anonymous: comments.is_anonymous,
          createdAt: comments.created_at,
          updatedAt: comments.updated_at,
        },
        user: {
          nickname: users.nickname,
        },
      })
      .from(reports)
      .leftJoin(comments, eq(reports.commentId, comments.id))
      .leftJoin(users, eq(reports.reportedBy, users.id));

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
        id: ratings.id,
        user_id: ratings.user_id,
        release_id: ratings.release_id,
        score: ratings.score,
        createdAt: ratings.created_at,
        updatedAt: ratings.updated_at,
        release: {
          id: releases.id,
          artistId: releases.artist_id,
          title: releases.title,
          type: releases.type,
          releaseDate: releases.release_date,
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
      .from(ratings)
      .leftJoin(releases, eq(ratings.release_id, releases.id))
      .leftJoin(artists, eq(releases.artist_id, artists.id))
      .where(eq(ratings.user_id, user_id))
      .orderBy(desc(ratings.created_at));

    return result.map(row => ({
      ...row,
      release: {
        ...row.release,
        artist: row.artist
      }
    })) as (Rating & { release: Release & { artist: Artist } })[];
  }

  async getUserComments(user_id: string): Promise<(Comment & { release: Release & { artist: Artist } })[]> {
    const result = await db
      .select({
        id: comments.id,
        user_id: comments.user_id,
        release_id: comments.release_id,
        text: comments.text,
        rating: comments.rating,
        is_anonymous: comments.is_anonymous,
        createdAt: comments.created_at,
        updatedAt: comments.updated_at,
        release: {
          id: releases.id,
          artistId: releases.artist_id,
          title: releases.title,
          type: releases.type,
          releaseDate: releases.release_date,
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

    return result.map(row => ({
      ...row,
      release: {
        ...row.release,
        artist: row.artist
      }
    })) as (Comment & { release: Release & { artist: Artist } })[];
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
          ...row.collection,
          releases: []
        });
      }
      
      if (row.release && row.artist) {
        collectionsMap.get(row.collection.id)!.releases.push({
          ...row.release,
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
        artist: row.artist!
      }));

    return {
      ...collectionData,
      releases: releasesData
    };
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [created] = await db
      .insert(collections)
      .values(collection)
      .returning();
    return created;
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
      .values({ collectionId, release_id, sortOrder })
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
