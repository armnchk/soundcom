import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { massImportService } from "./music-import";
import { 
  insertArtistSchema, 
  insertReleaseSchema, 
  insertRatingSchema, 
  insertCommentSchema,
  insertCommentReactionSchema,
  insertReportSchema
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
      const { genre, year, artistId } = req.query;
      const filters = {
        genre: genre as string,
        year: year ? parseInt(year as string) : undefined,
        artistId: artistId ? parseInt(artistId as string) : undefined,
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

  // Mass import endpoint for admin
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

  const httpServer = createServer(app);
  return httpServer;
}
