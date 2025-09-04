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
  type InsertArtist,
  type InsertRelease,
  type InsertRating,
  type InsertComment,
  type InsertCommentReaction,
  type InsertReport,
  type InsertCollection,
  type InsertCollectionRelease,
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
  getReleaseByTitleAndArtist(title: string, artistId: number): Promise<Release | undefined>;
  createRelease(release: InsertRelease): Promise<Release>;
  updateRelease(id: number, release: Partial<InsertRelease>): Promise<Release>;
  deleteRelease(id: number): Promise<void>;
  searchReleases(query: string): Promise<(Release & { artist: Artist })[]>;
  
  // Rating operations
  getRating(userId: string, releaseId: number): Promise<Rating | undefined>;
  upsertRating(rating: InsertRating): Promise<Rating>;
  getReleaseRatings(releaseId: number): Promise<{ averageRating: number; count: number }>;
  
  // Comment operations
  getComments(releaseId: number, sortBy?: 'date' | 'rating' | 'likes'): Promise<(Comment & { 
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
  deleteCommentReaction(commentId: number, userId: string): Promise<void>;
  
  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getReports(status?: string): Promise<(Report & { comment: Comment; user: Pick<User, 'nickname'> })[]>;
  updateReportStatus(id: number, status: string): Promise<Report>;
  
  // User profile operations
  getUserRatings(userId: string): Promise<(Rating & { release: Release & { artist: Artist } })[]>;
  getUserComments(userId: string): Promise<(Comment & { release: Release & { artist: Artist } })[]>;
  
  // Collection operations
  getCollections(activeOnly?: boolean): Promise<(Collection & { releases: (Release & { artist: Artist })[] })[]>;
  getCollection(id: number): Promise<(Collection & { releases: (Release & { artist: Artist })[] }) | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: number, collection: Partial<InsertCollection>): Promise<Collection>;
  deleteCollection(id: number): Promise<void>;
  addReleaseToCollection(collectionId: number, releaseId: number, sortOrder?: number): Promise<CollectionRelease>;
  removeReleaseFromCollection(collectionId: number, releaseId: number): Promise<void>;
  updateCollectionReleaseSortOrder(collectionId: number, releaseId: number, sortOrder: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserNickname(id: string, nickname: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ nickname, updatedAt: new Date() })
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
      whereConditions.push(eq(releases.isTestData, false));
    }
    
    if (filters?.artistId) {
      whereConditions.push(eq(releases.artistId, filters.artistId));
    }
    
    if (filters?.year) {
      whereConditions.push(sql`EXTRACT(YEAR FROM ${releases.releaseDate}) = ${filters.year}`);
    }

    let query = db
      .select({
        id: releases.id,
        artistId: releases.artistId,
        title: releases.title,
        releaseDate: releases.releaseDate,
        coverUrl: releases.coverUrl,
        streamingLinks: releases.streamingLinks,
        isTestData: releases.isTestData,
        createdAt: releases.createdAt,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.createdAt,
        },
        averageRating: sql<number>`COALESCE(AVG(${ratings.score}), 0)`,
        commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`,
      })
      .from(releases)
      .leftJoin(artists, eq(releases.artistId, artists.id))
      .leftJoin(ratings, eq(releases.id, ratings.releaseId))
      .leftJoin(comments, eq(releases.id, comments.releaseId))
      .groupBy(releases.id, artists.id);

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    const result = await query.orderBy(desc(releases.createdAt));
    return result as (Release & { artist: Artist; averageRating: number; commentCount: number })[];
  }

  async getRelease(id: number): Promise<(Release & { artist: Artist; averageRating: number; commentCount: number }) | undefined> {
    const [result] = await db
      .select({
        id: releases.id,
        artistId: releases.artistId,
        title: releases.title,
        releaseDate: releases.releaseDate,
        coverUrl: releases.coverUrl,
        streamingLinks: releases.streamingLinks,
        isTestData: releases.isTestData,
        createdAt: releases.createdAt,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.createdAt,
        },
        averageRating: sql<number>`COALESCE(AVG(${ratings.score}), 0)`,
        commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`,
      })
      .from(releases)
      .leftJoin(artists, eq(releases.artistId, artists.id))
      .leftJoin(ratings, eq(releases.id, ratings.releaseId))
      .leftJoin(comments, eq(releases.id, comments.releaseId))
      .where(eq(releases.id, id))
      .groupBy(releases.id, artists.id);

    return result as (Release & { artist: Artist; averageRating: number; commentCount: number }) | undefined;
  }

  async getReleaseByTitleAndArtist(title: string, artistId: number): Promise<Release | undefined> {
    const [release] = await db
      .select()
      .from(releases)
      .where(and(eq(releases.title, title), eq(releases.artistId, artistId)));
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

  async searchReleases(query: string): Promise<(Release & { artist: Artist })[]> {
    const result = await db
      .select({
        id: releases.id,
        artistId: releases.artistId,
        title: releases.title,
        releaseDate: releases.releaseDate,
        coverUrl: releases.coverUrl,
        streamingLinks: releases.streamingLinks,
        createdAt: releases.createdAt,
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.createdAt,
        },
      })
      .from(releases)
      .leftJoin(artists, eq(releases.artistId, artists.id))
      .where(
        or(
          ilike(releases.title, `%${query}%`),
          ilike(artists.name, `%${query}%`)
        )
      );

    return result as (Release & { artist: Artist })[];
  }

  // Rating operations
  async getRating(userId: string, releaseId: number): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.releaseId, releaseId)));
    return rating;
  }

  async upsertRating(rating: InsertRating): Promise<Rating> {
    const [result] = await db
      .insert(ratings)
      .values(rating)
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.releaseId],
        set: {
          score: rating.score,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getReleaseRatings(releaseId: number): Promise<{ averageRating: number; count: number }> {
    const [result] = await db
      .select({
        averageRating: sql<number>`COALESCE(AVG(${ratings.score}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(ratings)
      .where(eq(ratings.releaseId, releaseId));

    return result || { averageRating: 0, count: 0 };
  }

  // Comment operations
  async getComments(releaseId: number, sortBy: 'date' | 'rating' | 'likes' = 'date'): Promise<(Comment & { 
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
        orderBy = desc(comments.createdAt);
    }

    const result = await db
      .select({
        id: comments.id,
        userId: comments.userId,
        releaseId: comments.releaseId,
        text: comments.text,
        rating: comments.rating,
        isAnonymous: comments.isAnonymous,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        user: {
          id: users.id,
          nickname: users.nickname,
          profileImageUrl: users.profileImageUrl,
        },
        likeCount: sql<number>`COUNT(CASE WHEN ${commentReactions.reactionType} = 'like' THEN 1 END)`,
        dislikeCount: sql<number>`COUNT(CASE WHEN ${commentReactions.reactionType} = 'dislike' THEN 1 END)`,
      })
      .from(comments)
      .leftJoin(users, and(eq(comments.userId, users.id), eq(comments.isAnonymous, false)))
      .leftJoin(commentReactions, eq(comments.id, commentReactions.commentId))
      .where(eq(comments.releaseId, releaseId))
      .groupBy(comments.id, users.id)
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
      .set({ ...comment, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return updatedComment;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  // Comment reaction operations
  async upsertCommentReaction(reaction: InsertCommentReaction): Promise<CommentReaction> {
    const [result] = await db
      .insert(commentReactions)
      .values(reaction)
      .onConflictDoUpdate({
        target: [commentReactions.commentId, commentReactions.userId],
        set: {
          reactionType: reaction.reactionType,
        },
      })
      .returning();
    return result;
  }

  async deleteCommentReaction(commentId: number, userId: string): Promise<void> {
    await db
      .delete(commentReactions)
      .where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.userId, userId)));
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
        createdAt: reports.createdAt,
        comment: {
          id: comments.id,
          userId: comments.userId,
          releaseId: comments.releaseId,
          text: comments.text,
          rating: comments.rating,
          isAnonymous: comments.isAnonymous,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
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

    const result = await query.orderBy(desc(reports.createdAt));
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
  async getUserRatings(userId: string): Promise<(Rating & { release: Release & { artist: Artist } })[]> {
    const result = await db
      .select({
        id: ratings.id,
        userId: ratings.userId,
        releaseId: ratings.releaseId,
        score: ratings.score,
        createdAt: ratings.createdAt,
        updatedAt: ratings.updatedAt,
        release: {
          id: releases.id,
          artistId: releases.artistId,
          title: releases.title,
          type: releases.type,
          releaseDate: releases.releaseDate,
          coverUrl: releases.coverUrl,
          streamingLinks: releases.streamingLinks,
          isTestData: releases.isTestData,
          createdAt: releases.createdAt,
        },
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.createdAt,
        },
      })
      .from(ratings)
      .leftJoin(releases, eq(ratings.releaseId, releases.id))
      .leftJoin(artists, eq(releases.artistId, artists.id))
      .where(eq(ratings.userId, userId))
      .orderBy(desc(ratings.createdAt));

    return result.map(row => ({
      ...row,
      release: {
        ...row.release,
        artist: row.artist
      }
    })) as (Rating & { release: Release & { artist: Artist } })[];
  }

  async getUserComments(userId: string): Promise<(Comment & { release: Release & { artist: Artist } })[]> {
    const result = await db
      .select({
        id: comments.id,
        userId: comments.userId,
        releaseId: comments.releaseId,
        text: comments.text,
        rating: comments.rating,
        isAnonymous: comments.isAnonymous,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        release: {
          id: releases.id,
          artistId: releases.artistId,
          title: releases.title,
          type: releases.type,
          releaseDate: releases.releaseDate,
          coverUrl: releases.coverUrl,
          streamingLinks: releases.streamingLinks,
          isTestData: releases.isTestData,
          createdAt: releases.createdAt,
        },
        artist: {
          id: artists.id,
          name: artists.name,
          createdAt: artists.createdAt,
        },
      })
      .from(comments)
      .leftJoin(releases, eq(comments.releaseId, releases.id))
      .leftJoin(artists, eq(releases.artistId, artists.id))
      .where(eq(comments.userId, userId))
      .orderBy(desc(comments.createdAt));

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
        sortOrder: collectionReleases.sortOrder,
      })
      .from(collections)
      .leftJoin(collectionReleases, eq(collections.id, collectionReleases.collectionId))
      .leftJoin(releases, eq(collectionReleases.releaseId, releases.id))
      .leftJoin(artists, eq(releases.artistId, artists.id))
      .orderBy(collections.sortOrder, collectionReleases.sortOrder);

    if (activeOnly) {
      query.where(eq(collections.isActive, true));
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
        sortOrder: collectionReleases.sortOrder,
      })
      .from(collections)
      .leftJoin(collectionReleases, eq(collections.id, collectionReleases.collectionId))
      .leftJoin(releases, eq(collectionReleases.releaseId, releases.id))
      .leftJoin(artists, eq(releases.artistId, artists.id))
      .where(eq(collections.id, id))
      .orderBy(collectionReleases.sortOrder);

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
      .set({ ...collection, updatedAt: new Date() })
      .where(eq(collections.id, id))
      .returning();
    return updated;
  }

  async deleteCollection(id: number): Promise<void> {
    await db.delete(collections).where(eq(collections.id, id));
  }

  async addReleaseToCollection(collectionId: number, releaseId: number, sortOrder = 0): Promise<CollectionRelease> {
    const [created] = await db
      .insert(collectionReleases)
      .values({ collectionId, releaseId, sortOrder })
      .returning();
    return created;
  }

  async removeReleaseFromCollection(collectionId: number, releaseId: number): Promise<void> {
    await db
      .delete(collectionReleases)
      .where(and(
        eq(collectionReleases.collectionId, collectionId),
        eq(collectionReleases.releaseId, releaseId)
      ));
  }

  async updateCollectionReleaseSortOrder(collectionId: number, releaseId: number, sortOrder: number): Promise<void> {
    await db
      .update(collectionReleases)
      .set({ sortOrder })
      .where(and(
        eq(collectionReleases.collectionId, collectionId),
        eq(collectionReleases.releaseId, releaseId)
      ));
  }
}

export const storage = new DatabaseStorage();
