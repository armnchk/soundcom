import { Router } from 'express';
import { storage } from '../storage';
import { 
  requireAuth, 
  validateBody, 
  validateParams,
  validateQuery,
  schemas,
  rateLimits 
} from '../middleware';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Получение рейтингов релиза
router.get('/releases/:id', 
  rateLimits.general,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ratings = await storage.getReleaseRatings(id);
    
    // Convert string values to numbers
    const result = {
      averageRating: Number(ratings.averageRating) || 0,
      count: Number(ratings.count) || 0
    };
    
    res.json(result);
  })
);

// Получение рейтинга пользователя для релиза
router.get('/releases/:id/user-rating', 
  requireAuth,
  rateLimits.general,
  validateParams(schemas.id),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const rating = await storage.getRating(userId, id);
    res.json(rating || null);
  })
);

// Создание/обновление рейтинга
router.post('/releases/:id/rate', 
  requireAuth,
  rateLimits.ratings,
  validateParams(schemas.id),
  validateBody(schemas.createRating),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const { score } = req.body;

    const rating = await storage.upsertRating({ 
      userId, 
      releaseId: id, 
      score 
    });
    
    res.json(rating);
  })
);

// Получение рейтингов пользователя
router.get('/users/:id', 
  rateLimits.general,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ratings = await storage.getUserRatings(id);
    res.json(ratings);
  })
);

export default router;
