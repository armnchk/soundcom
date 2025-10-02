import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./googleAuth";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { 
  insertArtistSchema, 
  insertReleaseSchema, 
  insertRatingSchema, 
  insertCommentSchema,
  insertCommentReactionSchema,
  insertReportSchema,
  insertCollectionSchema,
  insertCollectionReleaseSchema,
  insertAutoImportPlaylistSchema,
  autoImportPlaylists
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Отключаем кэширование
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Возвращаем данные пользователя из сессии
      const user = {
        id: req.user.id,
        google_id: req.user.claims.sub,
        email: req.user.claims.email,
        firstName: req.user.claims.first_name || req.user.claims.given_name || '',
        lastName: req.user.claims.last_name || req.user.claims.family_name || '',
        profileImageUrl: req.user.claims.picture || null,
        isAdmin: req.user.is_admin || false,
        nickname: req.user.nickname || null
      };
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Nickname setup route
  app.post('/api/auth/nickname', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { nickname } = req.body;
      
      if (!nickname || nickname.length < 3 || nickname.length > 20) {
        return res.status(400).json({ message: "Nickname must be 3-20 characters" });
      }

      // Check if nickname is unique
      const existingUser = await storage.getUser(userId);
      if (existingUser?.nickname) {
        return res.status(400).json({ message: "Nickname already set" });
      }

      const user = await storage.updateUserNickname(userId, nickname);
      res.json(user);
    } catch (error) {
      console.error("Error setting nickname:", error);
      res.status(500).json({ message: "Failed to set nickname" });
    }
  });

  // Artists routes
  app.get('/api/artists', async (_req, res) => {
    try {
      const artists = await storage.getArtists();
      res.json(artists);
    } catch (error) {
      console.error("Error fetching artists:", error);
      res.status(500).json({ message: "Failed to fetch artists" });
    }
  });

  app.get('/api/artists/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const artist = await storage.getArtist(id);
      if (!artist) {
        return res.status(404).json({ message: "Artist not found" });
      }
      res.json(artist);
    } catch (error) {
      console.error("Error fetching artist:", error);
      res.status(500).json({ message: "Failed to fetch artist" });
    }
  });

  app.post('/api/artists', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const artistData = insertArtistSchema.parse(req.body);
      const artist = await storage.createArtist(artistData);
      res.status(201).json(artist);
    } catch (error) {
      console.error("Error creating artist:", error);
      res.status(500).json({ message: "Failed to create artist" });
    }
  });

  // Releases routes
  app.get('/api/releases', async (req, res) => {
    try {
      const { genre, year, artistId, includeTestData } = req.query;
      const filters = {
        genre: genre as string,
        year: year ? parseInt(year as string) : undefined,
        artistId: artistId ? parseInt(artistId as string) : undefined,
        includeTestData: includeTestData === 'true',
      };
      
      const releases = await storage.getReleases(filters);
      res.json(releases);
    } catch (error) {
      console.error("Error fetching releases:", error);
      res.status(500).json({ message: "Failed to fetch releases" });
    }
  });

  app.get('/api/releases/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const release = await storage.getRelease(id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      res.json(release);
    } catch (error) {
      console.error("Error fetching release:", error);
      res.status(500).json({ message: "Failed to fetch release" });
    }
  });

  app.post('/api/releases', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const releaseData = insertReleaseSchema.parse(req.body);
      const release = await storage.createRelease(releaseData);
      res.status(201).json(release);
    } catch (error) {
      console.error("Error creating release:", error);
      res.status(500).json({ message: "Failed to create release" });
    }
  });

  app.put('/api/releases/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const releaseData = insertReleaseSchema.partial().parse(req.body);
      const release = await storage.updateRelease(id, releaseData);
      res.json(release);
    } catch (error) {
      console.error("Error updating release:", error);
      res.status(500).json({ message: "Failed to update release" });
    }
  });

  app.delete('/api/releases/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteRelease(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting release:", error);
      res.status(500).json({ message: "Failed to delete release" });
    }
  });

  // Search routes
  app.get('/api/search', async (req, res) => {
    try {
      const { q, sortBy } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query required" });
      }
      
      const validSortOptions = ['date_desc', 'date_asc', 'rating_desc', 'rating_asc'];
      const sort = sortBy && typeof sortBy === 'string' && validSortOptions.includes(sortBy) ? 
        sortBy as 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc' : undefined;
      
      const releases = await storage.searchReleases(q, sort);
      res.json(releases);
    } catch (error) {
      console.error("Error searching releases:", error);
      res.status(500).json({ message: "Failed to search releases" });
    }
  });

  app.get('/api/search/artists', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query required" });
      }
      
      const artists = await storage.searchArtists(q);
      res.json(artists);
    } catch (error) {
      console.error("Error searching artists:", error);
      res.status(500).json({ message: "Failed to search artists" });
    }
  });

  // Ratings routes
  app.get('/api/releases/:id/ratings', async (req, res) => {
    try {
      const releaseId = parseInt(req.params.id);
      const ratings = await storage.getReleaseRatings(releaseId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  app.post('/api/releases/:id/rate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const releaseId = parseInt(req.params.id);
      const { score } = req.body;

      if (!score || score < 1 || score > 10) {
        return res.status(400).json({ message: "Score must be between 1 and 10" });
      }

      const rating = await storage.upsertRating({ userId, releaseId, score });
      res.json(rating);
    } catch (error) {
      console.error("Error rating release:", error);
      res.status(500).json({ message: "Failed to rate release" });
    }
  });

  app.get('/api/releases/:id/user-rating', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const releaseId = parseInt(req.params.id);
      const rating = await storage.getRating(userId, releaseId);
      res.json(rating || null);
    } catch (error) {
      console.error("Error fetching user rating:", error);
      res.status(500).json({ message: "Failed to fetch user rating" });
    }
  });

  // Comments routes
  app.get('/api/releases/:id/comments', async (req, res) => {
    try {
      const releaseId = parseInt(req.params.id);
      const { sortBy } = req.query;
      const comments = await storage.getComments(releaseId, sortBy as 'date' | 'rating' | 'likes');
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/releases/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const releaseId = parseInt(req.params.id);
      const { text, rating, isAnonymous } = req.body;

      if (!text && !rating) {
        return res.status(400).json({ message: "Either text or rating is required" });
      }

      if (text && text.length > 1000) {
        return res.status(400).json({ message: "Comment text cannot exceed 1000 characters" });
      }

      if (rating && (rating < 1 || rating > 10)) {
        return res.status(400).json({ message: "Rating must be between 1 and 10" });
      }

      // Check if user already has a comment with rating for this release
      if (rating && !isAnonymous) {
        const existingComment = await storage.getUserCommentForRelease(userId, releaseId);
        if (existingComment && existingComment.rating) {
          return res.status(400).json({ message: "You have already rated this release" });
        }
      }

      const commentData = {
        userId: isAnonymous ? null : userId,
        releaseId,
        text: text || null,
        rating: rating || null,
        isAnonymous: !!isAnonymous,
      };

      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.put('/api/comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const commentId = parseInt(req.params.id);
      const { text, rating } = req.body;

      if (text && text.length > 1000) {
        return res.status(400).json({ message: "Comment text cannot exceed 1000 characters" });
      }

      if (rating && (rating < 1 || rating > 10)) {
        return res.status(400).json({ message: "Rating must be between 1 and 10" });
      }

      const comment = await storage.updateComment(commentId, { text, rating });
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  app.delete('/api/comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const commentId = parseInt(req.params.id);

      await storage.deleteComment(commentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Comment reactions routes
  app.post('/api/comments/:id/react', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const commentId = parseInt(req.params.id);
      const { reactionType } = req.body;

      if (!['like', 'dislike'].includes(reactionType)) {
        return res.status(400).json({ message: "Reaction type must be 'like' or 'dislike'" });
      }

      const reaction = await storage.upsertCommentReaction({ commentId, userId, reactionType });
      res.json(reaction);
    } catch (error) {
      console.error("Error reacting to comment:", error);
      res.status(500).json({ message: "Failed to react to comment" });
    }
  });

  app.delete('/api/comments/:id/react', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const commentId = parseInt(req.params.id);

      await storage.deleteCommentReaction(commentId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing reaction:", error);
      res.status(500).json({ message: "Failed to remove reaction" });
    }
  });

  // Import endpoints (MTS/Zvuk parsing and Deezer/iTunes API)
  app.get('/api/import/stats', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const stats = await storage.getImportStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting import stats:", error);
      res.status(500).json({ message: "Failed to get import stats" });
    }
  });

  // Временный эндпоинт для тестирования без авторизации
  app.post('/api/import/test-playlist-debug', async (req: any, res) => {
    try {
      const { playlistUrl } = req.body;
      if (!playlistUrl || typeof playlistUrl !== 'string') {
        return res.status(400).json({ message: "Playlist URL is required" });
      }
      console.log('🎵 Тестируем импорт плейлиста:', playlistUrl);
      const musicImporter = await import('./music-importer');
      const result = await musicImporter.importFromRussianPlaylist(playlistUrl);
      res.json({ success: true, stats: result });
    } catch (error: any) {
      console.error("Error testing playlist import:", error);
      res.status(500).json({ message: error.message || "Failed to import playlist" });
    }
  });

  app.post('/api/import/test-playlist', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }
      const { playlistUrl } = req.body;
      if (!playlistUrl || typeof playlistUrl !== 'string') {
        return res.status(400).json({ message: "Playlist URL is required" });
      }
      const musicImporter = await import('./music-importer');
      const result = await musicImporter.importFromRussianPlaylist(playlistUrl);
      res.json({ success: true, stats: result });
    } catch (error: any) {
      console.error("Error testing playlist import:", error);
      res.status(500).json({ message: error.message || "Failed to import playlist" });
    }
  });

  app.post('/api/import/update-artists', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }
      const musicImporter = await import('./music-importer');
      const result = await musicImporter.updateExistingArtists();
      res.json({ success: true, stats: result });
    } catch (error: any) {
      console.error("Error updating artists:", error);
      res.status(500).json({ message: error.message || "Failed to update artists" });
    }
  });

  // Background Import Jobs
  app.post('/api/import/background-playlist', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }
      const { playlistUrl } = req.body;
      if (!playlistUrl || typeof playlistUrl !== 'string') {
        return res.status(400).json({ message: "Playlist URL is required" });
      }
      const backgroundJobs = await import('./background-jobs');
      const jobId = await backgroundJobs.createImportJob({
        playlistUrl,
        status: 'pending',
        createdBy: userId,
      });
      res.json({ success: true, jobId, message: 'Background import job created. Use /api/import/jobs to check progress.' });
    } catch (error: any) {
      console.error("Error creating background import job:", error);
      res.status(500).json({ message: error.message || "Failed to create background import job" });
    }
  });

  app.get('/api/import/jobs', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }
      const userId = req.user.id;
      const backgroundJobs = await import('./background-jobs');
      const jobs = await backgroundJobs.getAllImportJobs(userId);
      res.json(jobs);
    } catch (error: any) {
      console.error("Error fetching import jobs:", error);
      res.status(500).json({ message: error.message || "Failed to fetch import jobs" });
    }
  });

  app.get('/api/import/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const backgroundJobs = await import('./background-jobs');
      const job = await backgroundJobs.getImportJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error: any) {
      console.error("Error fetching import job:", error);
      res.status(500).json({ message: error.message || "Failed to fetch import job" });
    }
  });

  app.post('/api/import/jobs/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const backgroundJobs = await import('./background-jobs');
      const cancelled = await backgroundJobs.cancelImportJob(jobId);
      if (!cancelled) {
        return res.status(404).json({ message: "Job not found or already completed" });
      }
      res.json({ success: true, message: "Job cancelled" });
    } catch (error: any) {
      console.error("Error cancelling import job:", error);
      res.status(500).json({ message: error.message || "Failed to cancel import job" });
    }
  });

  // Import Logs endpoints
  app.get('/api/import-logs', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const logs = await storage.getImportLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching import logs:", error);
      res.status(500).json({ message: "Failed to fetch import logs" });
    }
  });

  app.get('/api/import-logs/latest', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const latestLog = await storage.getLatestImportLog();
      res.json(latestLog || null);
    } catch (error) {
      console.error("Error fetching latest import log:", error);
      res.status(500).json({ message: "Failed to fetch latest import log" });
    }
  });
  // Reports routes
  app.post('/api/comments/:id/report', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const commentId = parseInt(req.params.id);
      const { reason } = req.body;

      const report = await storage.createReport({ commentId, reportedBy: userId, reason });
      res.status(201).json(report);
    } catch (error) {
      console.error("Error reporting comment:", error);
      res.status(500).json({ message: "Failed to report comment" });
    }
  });

  // Admin routes
  app.get('/api/admin/reports', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { status } = req.query;
      const reports = await storage.getReports(status as string);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.put('/api/admin/reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const reportId = parseInt(req.params.id);
      const { status } = req.body;

      if (!['pending', 'resolved'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'pending' or 'resolved'" });
      }

      const report = await storage.updateReportStatus(reportId, status);
      res.json(report);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ message: "Failed to update report" });
    }
  });


  // Import features removed

  

  

  

  

  

  // User profile routes
  app.get('/api/users/:id/ratings', async (req, res) => {
    try {
      const userId = req.params.id;
      const ratings = await storage.getUserRatings(userId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching user ratings:", error);
      res.status(500).json({ message: "Failed to fetch user ratings" });
    }
  });

  app.get('/api/users/:id/comments', async (req, res) => {
    try {
      const userId = req.params.id;
      const comments = await storage.getUserComments(userId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching user comments:", error);
      res.status(500).json({ message: "Failed to fetch user comments" });
    }
  });

  // Collection routes
  app.get('/api/collections', async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly !== 'false';
      const collections = await storage.getCollections(activeOnly);
      // Sort by sortOrder, then by id for stable sorting when sortOrder is the same
      const sortedCollections = collections.sort((a, b) => {
        const sortOrderDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
        if (sortOrderDiff !== 0) return sortOrderDiff;
        // If sortOrder is the same, sort by id (ascending = earlier created first)
        return a.id - b.id;
      });
      res.json(sortedCollections);
    } catch (error) {
      console.error("Error fetching collections:", error);
      res.status(500).json({ message: "Failed to fetch collections" });
    }
  });

  app.get('/api/collections/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const collection = await storage.getCollection(id);
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      res.json(collection);
    } catch (error) {
      console.error("Error fetching collection:", error);
      res.status(500).json({ message: "Failed to fetch collection" });
    }
  });

  app.post('/api/collections', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Extract releaseIds if present, validate the rest
      const { releaseIds, ...collectionData } = req.body;
      const validatedData = insertCollectionSchema.parse(collectionData);
      
      // Create the collection first
      const collection = await storage.createCollection(validatedData);
      
      // Add releases if provided
      if (releaseIds && Array.isArray(releaseIds) && releaseIds.length > 0) {
        for (let i = 0; i < releaseIds.length; i++) {
          await storage.addReleaseToCollection(collection.id, releaseIds[i], i);
        }
      }
      
      // Return collection with releases
      const fullCollection = await storage.getCollection(collection.id);
      res.status(201).json(fullCollection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collection data", errors: error.errors });
      }
      console.error("Error creating collection:", error);
      res.status(500).json({ message: "Failed to create collection" });
    }
  });

  app.put('/api/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      
      // Extract releaseIds if present, validate the rest
      const { releaseIds, ...collectionData } = req.body;
      const validatedData = insertCollectionSchema.partial().parse(collectionData);
      
      // Update the collection first
      const collection = await storage.updateCollection(id, validatedData);
      
      // Update releases if provided
      if (releaseIds && Array.isArray(releaseIds)) {
        // Remove all existing releases for this collection
        await storage.removeAllReleasesFromCollection(id);
        
        // Add new releases with proper order
        for (let i = 0; i < releaseIds.length; i++) {
          await storage.addReleaseToCollection(id, releaseIds[i], i);
        }
      }
      
      // Return updated collection with releases
      const fullCollection = await storage.getCollection(id);
      res.json(fullCollection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collection data", errors: error.errors });
      }
      console.error("Error updating collection:", error);
      res.status(500).json({ message: "Failed to update collection" });
    }
  });

  app.delete('/api/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCollection(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting collection:", error);
      res.status(500).json({ message: "Failed to delete collection" });
    }
  });

  app.post('/api/collections/:id/releases', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const collectionId = parseInt(req.params.id);
      const { releaseId, sortOrder } = req.body;

      if (!releaseId) {
        return res.status(400).json({ message: "Release ID is required" });
      }

      const collectionRelease = await storage.addReleaseToCollection(collectionId, releaseId, sortOrder);
      res.status(201).json(collectionRelease);
    } catch (error) {
      console.error("Error adding release to collection:", error);
      res.status(500).json({ message: "Failed to add release to collection" });
    }
  });

  app.delete('/api/collections/:id/releases/:releaseId', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const collectionId = parseInt(req.params.id);
      const releaseId = parseInt(req.params.releaseId);

      await storage.removeReleaseFromCollection(collectionId, releaseId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing release from collection:", error);
      res.status(500).json({ message: "Failed to remove release from collection" });
    }
  });

  app.put('/api/collections/:id/releases/:releaseId/sort', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const collectionId = parseInt(req.params.id);
      const releaseId = parseInt(req.params.releaseId);
      const { sortOrder } = req.body;

      if (typeof sortOrder !== 'number') {
        return res.status(400).json({ message: "Sort order must be a number" });
      }

      await storage.updateCollectionReleaseSortOrder(collectionId, releaseId, sortOrder);
      res.status(204).send();
    } catch (error) {
      console.error("Error updating sort order:", error);
      res.status(500).json({ message: "Failed to update sort order" });
    }
  });

  // Admin collections endpoints
  app.get('/api/admin/collections', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const collections = await storage.getCollections(false); // Get all collections for admin
      res.json(collections);
    } catch (error) {
      console.error("Error fetching admin collections:", error);
      res.status(500).json({ message: "Failed to fetch collections" });
    }
  });

  app.post('/api/admin/collections', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const collection = await storage.createCollection({
        ...req.body,
        userId: userId
      });
      res.json(collection);
    } catch (error) {
      console.error("Error creating collection:", error);
      res.status(500).json({ message: "Failed to create collection" });
    }
  });

  app.delete('/api/admin/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deleteCollection(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting collection:", error);
      res.status(500).json({ message: "Failed to delete collection" });
    }
  });

  app.post('/api/admin/collections/:id/releases', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { releaseId, sortOrder } = req.body;
      const collectionId = parseInt(req.params.id);
      
      const collectionRelease = await storage.addReleaseToCollection(collectionId, releaseId, sortOrder);
      res.json(collectionRelease);
    } catch (error) {
      console.error("Error adding release to collection:", error);
      res.status(500).json({ message: "Failed to add release to collection" });
    }
  });

  app.delete('/api/admin/collections/:id/releases/:releaseId', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const collectionId = parseInt(req.params.id);
      const releaseId = parseInt(req.params.releaseId);
      
      await storage.removeReleaseFromCollection(collectionId, releaseId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing release from collection:", error);
      res.status(500).json({ message: "Failed to remove release from collection" });
    }
  });

  app.post('/api/import/update-artists', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      console.log(`Starting artist update process`);
      
      // Update existing artists
      const { updateExistingArtists } = await import('./music-importer');
      const stats = await updateExistingArtists();
      
      res.json({
        success: true,
        stats,
        message: `Update completed: ${stats.newReleases} new releases, ${stats.updatedArtists} artists updated, ${stats.errors.length} errors`
      });

    } catch (error: any) {
      console.error("Error during artist update:", error);
      res.status(500).json({ 
        success: false,
        message: "Update failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get('/api/import/stats', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get database statistics - we'll add these methods to storage interface
      const totalArtists = 0; // await storage.getArtistCount();
      const totalReleases = 0; // await storage.getReleaseCount();
      const artistsWithDeezer = 0; // await storage.getArtistsWithDeezerCount();
      const recentReleases = 0; // await storage.getRecentReleasesCount(7);

      res.json({
        totalArtists,
        totalReleases,
        artistsWithDeezer,
        recentReleases,
        deezerIntegration: artistsWithDeezer > 0 ? 'connected' : 'not_connected'
      });

    } catch (error) {
      console.error("Error getting import stats:", error);
      res.status(500).json({ message: "Failed to fetch import stats" });
    }
  });

  

  // Auto Import Playlists management (Admin only)
  app.get('/api/auto-import-playlists', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const playlists = await storage.getAutoImportPlaylists();
      res.json(playlists);
    } catch (error) {
      console.error("Error fetching auto playlists:", error);
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  app.post('/api/auto-import-playlists', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Добавляем user_id к данным плейлиста
      const playlistData = {
        ...req.body,
        user_id: req.user.id
      };
      
      const validated = insertAutoImportPlaylistSchema.parse(playlistData);
      
      const playlist = await storage.createAutoImportPlaylist(validated);
      
      res.json(playlist);
    } catch (error) {
      console.error("Error creating auto playlist:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ 
          message: "Ошибка валидации", 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to create playlist" });
    }
  });

  app.put('/api/auto-import-playlists/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const validated = insertAutoImportPlaylistSchema.partial().parse(req.body);
      const playlist = await storage.updateAutoImportPlaylist(id, validated);
      res.json(playlist);
    } catch (error) {
      console.error("Error updating auto playlist:", error);
      res.status(500).json({ message: "Failed to update playlist" });
    }
  });

  app.delete('/api/auto-import-playlists/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteAutoImportPlaylist(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting auto playlist:", error);
      res.status(500).json({ message: "Failed to delete playlist" });
    }
  });

  // Manual daily import - запуск импорта всех плейлистов
  app.post('/api/import/manual-daily', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем админские права из сессии
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('🚀 Запускаем ежедневный импорт всех плейлистов...');
      
      // Получаем все включенные плейлисты
      const playlists = await storage.getAutoImportPlaylists();
      const enabledPlaylists = playlists.filter(p => p.enabled);
      
      console.log(`📋 Найдено ${enabledPlaylists.length} включенных плейлистов`);
      
      if (enabledPlaylists.length === 0) {
        return res.json({ 
          success: true, 
          message: 'Нет включенных плейлистов для импорта',
          playlistsProcessed: 0
        });
      }

      // Создаем задачи импорта для каждого плейлиста
      const backgroundJobs = await import('./background-jobs');
      const jobIds = [];
      
      for (const playlist of enabledPlaylists) {
        try {
          const jobId = await backgroundJobs.createImportJob({
            playlist_id: playlist.id,
            status: 'pending'
          });
          jobIds.push(jobId);
          console.log(`✅ Создана задача импорта ${jobId} для плейлиста: ${playlist.name}`);
        } catch (error) {
          console.error(`❌ Ошибка создания задачи для плейлиста ${playlist.name}:`, error);
        }
      }

      res.json({ 
        success: true, 
        message: `Создано ${jobIds.length} задач импорта`,
        jobIds,
        playlistsProcessed: enabledPlaylists.length
      });
    } catch (error) {
      console.error("Error starting manual daily import:", error);
      res.status(500).json({ message: error.message || "Failed to start daily import" });
    }
  });

  // Эндпоинт для миграции полей релизов
  app.post('/api/migrate/release-fields', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем, что пользователь админ
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('🔄 Добавляем новые поля в таблицу releases...');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_small TEXT;
      `);
      console.log('✅ Добавлено поле cover_small');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_medium TEXT;
      `);
      console.log('✅ Добавлено поле cover_medium');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_big TEXT;
      `);
      console.log('✅ Добавлено поле cover_big');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_xl TEXT;
      `);
      console.log('✅ Добавлено поле cover_xl');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS duration INTEGER;
      `);
      console.log('✅ Добавлено поле duration');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS explicit_lyrics BOOLEAN DEFAULT FALSE;
      `);
      console.log('✅ Добавлено поле explicit_lyrics');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS explicit_content_lyrics INTEGER DEFAULT 0;
      `);
      console.log('✅ Добавлено поле explicit_content_lyrics');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS explicit_content_cover INTEGER DEFAULT 0;
      `);
      console.log('✅ Добавлено поле explicit_content_cover');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS genres JSONB;
      `);
      console.log('✅ Добавлено поле genres');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS upc VARCHAR(50);
      `);
      console.log('✅ Добавлено поле upc');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS label VARCHAR(255);
      `);
      console.log('✅ Добавлено поле label');
      
      await db.execute(sql`
        ALTER TABLE releases ADD COLUMN IF NOT EXISTS contributors JSONB;
      `);
      console.log('✅ Добавлено поле contributors');
      
      console.log('🎉 Миграция завершена успешно!');
      res.json({ message: "Migration completed successfully" });
      
    } catch (error) {
      console.error('❌ Ошибка миграции:', error);
      res.status(500).json({ message: "Migration failed", error: error.message });
    }
  });

  // Эндпоинт для удаления поля fans из таблицы releases
  app.post('/api/migrate/remove-fans-field', isAuthenticated, async (req: any, res) => {
    try {
      // Проверяем, что пользователь админ
      if (!req.user?.is_admin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('🔄 Удаляем поле fans из таблицы releases...');
      
      await db.execute(sql`
        ALTER TABLE releases DROP COLUMN IF EXISTS fans;
      `);
      console.log('✅ Удалено поле fans');
      
      console.log('🎉 Миграция завершена успешно!');
      res.json({ message: "Migration completed successfully" });
      
    } catch (error) {
      console.error('❌ Ошибка миграции:', error);
      res.status(500).json({ message: "Migration failed", error: error.message });
    }
  });

  // ВРЕМЕННЫЙ endpoint для миграции без аутентификации (только для dev)
  app.post('/api/migrate/dev', async (req, res) => {
    try {
      console.log('🔄 [DEV] Выполняем миграцию базы данных...\n');
      
      // Добавляем новые поля
      console.log('📝 Добавляем новые поля в таблицу releases...');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_small TEXT;`);
      console.log('✅ Добавлено поле cover_small');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_medium TEXT;`);
      console.log('✅ Добавлено поле cover_medium');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_big TEXT;`);
      console.log('✅ Добавлено поле cover_big');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_xl TEXT;`);
      console.log('✅ Добавлено поле cover_xl');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS duration INTEGER;`);
      console.log('✅ Добавлено поле duration');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS explicit_lyrics BOOLEAN DEFAULT FALSE;`);
      console.log('✅ Добавлено поле explicit_lyrics');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS explicit_content_lyrics INTEGER DEFAULT 0;`);
      console.log('✅ Добавлено поле explicit_content_lyrics');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS explicit_content_cover INTEGER DEFAULT 0;`);
      console.log('✅ Добавлено поле explicit_content_cover');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS genres JSONB;`);
      console.log('✅ Добавлено поле genres');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS upc VARCHAR(50);`);
      console.log('✅ Добавлено поле upc');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS label VARCHAR(255);`);
      console.log('✅ Добавлено поле label');
      
      await db.execute(sql`ALTER TABLE releases ADD COLUMN IF NOT EXISTS contributors JSONB;`);
      console.log('✅ Добавлено поле contributors');
      
      // Удаляем поле fans
      console.log('\n🗑️  Удаляем поле fans из таблицы releases...');
      await db.execute(sql`ALTER TABLE releases DROP COLUMN IF EXISTS fans;`);
      console.log('✅ Удалено поле fans');
      
      console.log('\n🎉 Миграция завершена успешно!');
      res.json({ 
        success: true, 
        message: "Migration completed successfully",
        fields_added: [
          'cover_small', 'cover_medium', 'cover_big', 'cover_xl',
          'duration', 'explicit_lyrics', 'explicit_content_lyrics', 
          'explicit_content_cover', 'genres', 'upc', 'label', 'contributors'
        ],
        fields_removed: ['fans']
      });
      
    } catch (error) {
      console.error('❌ Ошибка миграции:', error);
      res.status(500).json({ 
        success: false, 
        message: "Migration failed", 
        error: error.message 
      });
    }
  });

  // ВРЕМЕННЫЙ endpoint для очистки только релизов (только для dev)
  app.post('/api/migrate/clean-releases', async (req, res) => {
    try {
      console.log('🧹 [DEV] Очищаем только релизы...\n');
      
      const clearedTables = [];
      const errors = [];
      
      // Сначала получаем количество релизов до очистки
      const countBefore = await db.execute(sql`SELECT COUNT(*) as count FROM releases;`);
      const releasesCountBefore = countBefore.rows[0]?.count || 0;
      console.log(`📊 Релизов до очистки: ${releasesCountBefore}`);
      
      // Очищаем связанные таблицы (в правильном порядке)
      try {
        await db.execute(sql`DELETE FROM ratings WHERE release_id IN (SELECT id FROM releases);`);
        clearedTables.push('ratings (связанные с релизами)');
        console.log('✅ Очищены рейтинги релизов');
      } catch (error) {
        errors.push(`ratings: ${error.message}`);
        console.log('⚠️ Ошибка очистки рейтингов:', error.message);
      }
      
      try {
        await db.execute(sql`DELETE FROM comments WHERE release_id IN (SELECT id FROM releases);`);
        clearedTables.push('comments (связанные с релизами)');
        console.log('✅ Очищены комментарии релизов');
      } catch (error) {
        errors.push(`comments: ${error.message}`);
        console.log('⚠️ Ошибка очистки комментариев:', error.message);
      }
      
      try {
        await db.execute(sql`DELETE FROM collection_releases WHERE release_id IN (SELECT id FROM releases);`);
        clearedTables.push('collection_releases (связанные с релизами)');
        console.log('✅ Очищены связи коллекций с релизами');
      } catch (error) {
        errors.push(`collection_releases: ${error.message}`);
        console.log('⚠️ Ошибка очистки связей коллекций:', error.message);
      }
      
      // Теперь очищаем сами релизы
      try {
        await db.execute(sql`DELETE FROM releases;`);
        clearedTables.push('releases');
        console.log('✅ Очищена таблица releases');
      } catch (error) {
        errors.push(`releases: ${error.message}`);
        console.log('⚠️ Ошибка очистки релизов:', error.message);
      }
      
      // Получаем количество релизов после очистки
      const countAfter = await db.execute(sql`SELECT COUNT(*) as count FROM releases;`);
      const releasesCountAfter = countAfter.rows[0]?.count || 0;
      console.log(`📊 Релизов после очистки: ${releasesCountAfter}`);
      
      console.log('\n🎉 Очистка релизов завершена!');
      console.log(`Удалено релизов: ${releasesCountBefore - releasesCountAfter}`);
      console.log(`Очищено связанных таблиц: ${clearedTables.length}`);
      if (errors.length > 0) {
        console.log(`Ошибок: ${errors.length}`);
      }
      
      res.json({ 
        success: true, 
        message: "Releases cleaned successfully",
        tables_cleared: clearedTables,
        errors: errors,
        releases_before: releasesCountBefore,
        releases_after: releasesCountAfter,
        releases_deleted: releasesCountBefore - releasesCountAfter,
        cleared_count: clearedTables.length,
        error_count: errors.length
      });
      
    } catch (error) {
      console.error('❌ Критическая ошибка очистки:', error);
      res.status(500).json({ 
        success: false, 
        message: "Releases cleanup failed", 
        error: error.message 
      });
    }
  });

  // ВРЕМЕННЫЙ endpoint для очистки кэша дискографии (только для dev)
  app.post('/api/migrate/clear-cache', async (req, res) => {
    try {
      console.log('🧹 [DEV] Очищаем кэш дискографии...\n');
      
      await db.execute(sql`DELETE FROM discography_cache;`);
      console.log('✅ Очищен кэш дискографии');
      
      res.json({ 
        success: true, 
        message: "Discography cache cleared successfully"
      });
      
    } catch (error) {
      console.error('❌ Ошибка очистки кэша:', error);
      res.status(500).json({ 
        success: false, 
        message: "Cache cleanup failed", 
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
