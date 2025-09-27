import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { massImportService } from "./music-import";
import { scheduleDaily, stopScheduler, getSchedulerStatus, runDailyMusicImport, scheduleWeeklyReleaseDateUpdate } from "./scheduler";
import { musicAPI } from "./combined-music-api";
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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

  // Search route
  app.get('/api/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query required" });
      }
      
      const releases = await storage.searchReleases(q);
      res.json(releases);
    } catch (error) {
      console.error("Error searching releases:", error);
      res.status(500).json({ message: "Failed to search releases" });
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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

  // Mass import endpoint for admin (by artists)
  app.post('/api/admin/import', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      const { artists } = req.body;
      if (!artists || !Array.isArray(artists)) {
        return res.status(400).json({ message: "Artists array is required" });
      }

      const result = await massImportService.importArtists(artists);
      res.json(result);
    } catch (error) {
      console.error("Error importing artists:", error);
      res.status(500).json({ message: "Failed to import artists" });
    }
  });

  // Mass import endpoint for admin (by years)
  app.post('/api/admin/import/years', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      const { years } = req.body;
      if (!years || !Array.isArray(years)) {
        return res.status(400).json({ message: "Years array is required" });
      }

      // Validate years are numbers
      const validYears = years.filter((year: any) => 
        typeof year === 'number' && year >= 1900 && year <= new Date().getFullYear()
      );

      if (validYears.length === 0) {
        return res.status(400).json({ message: "Valid years (1900-current) are required" });
      }

      const result = await massImportService.importByYears(validYears);
      res.json(result);
    } catch (error) {
      console.error("Error importing by years:", error);
      res.status(500).json({ message: "Failed to import by years" });
    }
  });

  // Import stats endpoint for admin
  app.get('/api/admin/import/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      const stats = await massImportService.getImportStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching import stats:", error);
      res.status(500).json({ message: "Failed to fetch import stats" });
    }
  });

  // Yandex Music Import Stats
  app.get('/api/import/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      const stats = await storage.getImportStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting import stats:", error);
      res.status(500).json({ message: "Failed to get import stats" });
    }
  });

  // Test Yandex Music Playlist Import
  app.post('/api/import/test-playlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      const { playlistUrl } = req.body;
      if (!playlistUrl || typeof playlistUrl !== 'string') {
        return res.status(400).json({ message: "Playlist URL is required" });
      }

      if (!playlistUrl.includes('music.mts.ru') && !playlistUrl.includes('music.yandex.ru')) {
        return res.status(400).json({ message: "Invalid playlist URL - supported: MTS Music, Yandex Music" });
      }

      // Import from playlist using the music importer
      const musicImporter = await import('./music-importer');
      const result = await musicImporter.importFromRussianPlaylist(playlistUrl);
      
      res.json({
        success: true,
        stats: result
      });
    } catch (error: any) {
      console.error("Error testing playlist import:", error);
      res.status(500).json({ message: error.message || "Failed to import playlist" });
    }
  });

  // Update existing artists with new releases
  app.post('/api/import/update-artists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      // Update all artists with Spotify IDs
      const musicImporter = await import('./music-importer');
      const result = await musicImporter.updateAllArtists();
      
      res.json({
        success: true,
        stats: result
      });
    } catch (error: any) {
      console.error("Error updating artists:", error);
      res.status(500).json({ message: error.message || "Failed to update artists" });
    }
  });

  // Test single artist API (temporary testing endpoint)
  app.post('/api/test-single-artist', async (req, res) => {
    try {
      const { artistName } = req.body;
      if (!artistName) {
        return res.status(400).json({ message: "Artist name is required" });
      }

      console.log(`🧪 Тестирование артиста: ${artistName}`);
      
      // Simple test using combined music API
      const combinedAPI = await import('./combined-music-api');
      const musicAPI = new combinedAPI.CombinedMusicAPI();
      
      const result = await musicAPI.findArtist(artistName);
      
      if (!result) {
        return res.json({
          success: false,
          message: `Artist "${artistName}" not found`,
          albums: []
        });
      }
      
      const { artist, albums } = result;
      
      res.json({
        success: true,
        artist: {
          name: artist.name,
          source: artist.source,
          id: artist.id
        },
        albums: albums.map(album => ({
          title: album.title,
          releaseDate: album.releaseDate,
          type: album.albumType,
          id: album.id
        })),
        totalAlbums: albums.length,
        message: `Found ${albums.length} albums for ${artist.name}`
      });
    } catch (error: any) {
      console.error("Error testing artist:", error);
      res.status(500).json({ message: error.message || "Failed to test artist" });
    }
  });

  // Manual Daily Import Trigger - for testing
  app.post('/api/import/manual-daily', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      console.log('🎯 Администратор запустил ручной импорт');
      
      // Import from scheduled daily import
      const scheduler = await import('./scheduler');
      const result = await scheduler.manualImportTrigger();
      
      res.json({
        success: true,
        stats: result,
        message: 'Manual daily import completed successfully'
      });
    } catch (error: any) {
      console.error("Error during manual daily import:", error);
      res.status(500).json({ message: error.message || "Failed to run manual daily import" });
    }
  });

  // Background Import Jobs
  app.post('/api/import/background-playlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      const { playlistUrl } = req.body;
      if (!playlistUrl || typeof playlistUrl !== 'string') {
        return res.status(400).json({ message: "Playlist URL is required" });
      }

      if (!playlistUrl.includes('music.mts.ru') && !playlistUrl.includes('music.yandex.ru')) {
        return res.status(400).json({ message: "Invalid playlist URL - supported: MTS Music, Yandex Music" });
      }

      // Create background import job
      const backgroundJobs = await import('./background-jobs');
      const jobId = await backgroundJobs.createImportJob({
        playlistUrl,
        status: 'pending',
        createdBy: userId,
      });
      
      res.json({
        success: true,
        jobId,
        message: 'Background import job created. Use /api/import/jobs to check progress.'
      });
    } catch (error: any) {
      console.error("Error creating background import job:", error);
      res.status(500).json({ message: error.message || "Failed to create background import job" });
    }
  });

  app.get('/api/import/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
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


  app.post('/api/import/update-artists', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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
      // Check if user is admin
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get database statistics - we'll add these methods to storage interface
      const totalArtists = 0; // await storage.getArtistCount();
      const totalReleases = 0; // await storage.getReleaseCount();
      const artistsWithSpotify = 0; // await storage.getArtistsWithSpotifyCount();
      const recentReleases = 0; // await storage.getRecentReleasesCount(7);

      res.json({
        totalArtists,
        totalReleases,
        artistsWithSpotify,
        recentReleases,
        spotifyIntegration: artistsWithSpotify > 0 ? 'connected' : 'not_connected'
      });

    } catch (error) {
      console.error("Error getting import stats:", error);
      res.status(500).json({ message: "Failed to fetch import stats" });
    }
  });

  // Automatic Scheduler Management Endpoints
  
  // Get scheduler status
  app.get('/api/scheduler/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      const status = getSchedulerStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({ message: "Failed to get scheduler status" });
    }
  });

  // Start automatic scheduler
  app.post('/api/scheduler/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      const schedulerInfo = scheduleDaily();
      
      // Также запускаем еженедельное обновление дат релизов
      scheduleWeeklyReleaseDateUpdate();
      
      res.json({
        success: true,
        message: "Автоматический планировщик запущен",
        ...schedulerInfo
      });
    } catch (error) {
      console.error("Error starting scheduler:", error);
      res.status(500).json({ message: "Failed to start scheduler" });
    }
  });

  // Stop automatic scheduler
  app.post('/api/scheduler/stop', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      const stopped = stopScheduler();
      res.json({
        success: stopped,
        message: stopped ? "Автоматический планировщик остановлен" : "Планировщик уже был остановлен"
      });
    } catch (error) {
      console.error("Error stopping scheduler:", error);
      res.status(500).json({ message: "Failed to stop scheduler" });
    }
  });

  // Manually trigger daily import
  app.post('/api/scheduler/trigger', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin rights required." });
      }

      // Run in background to avoid timeout
      runDailyMusicImport().then(stats => {
        console.log('📊 Ручной импорт завершен:', stats);
      }).catch(error => {
        console.error('❌ Ошибка ручного импорта:', error);
      });

      res.json({
        success: true,
        message: "Ежедневный импорт запущен в фоне. Проверьте логи сервера для отслеживания прогресса."
      });
    } catch (error) {
      console.error("Error triggering manual import:", error);
      res.status(500).json({ message: "Failed to trigger manual import" });
    }
  });

  // Auto Import Playlists management (Admin only)
  app.get('/api/auto-import-playlists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log("Received playlist data:", JSON.stringify(req.body, null, 2));
      
      const validated = insertAutoImportPlaylistSchema.parse(req.body);
      console.log("Validated playlist data:", JSON.stringify(validated, null, 2));
      
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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

  // Import Logs endpoints
  app.get('/api/import-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const latestLog = await storage.getLatestImportLog();
      res.json(latestLog || null);
    } catch (error) {
      console.error("Error fetching latest import log:", error);
      res.status(500).json({ message: "Failed to fetch latest import log" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
