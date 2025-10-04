import { Router } from 'express';
import { storage } from '../storage';
import { ServiceContainer } from '../services';
import { 
  requireAuth, 
  validateParams,
  validateQuery,
  schemas,
  rateLimits 
} from '../middleware';
import { asyncHandler } from '../middleware/errorHandler';

const services = new ServiceContainer(storage);
const router = Router();

// Получение оценок пользователя с фильтрацией и сортировкой
router.get('/:userId/ratings', 
  rateLimits.general,
  validateParams(schemas.userId),
  validateQuery(schemas.userRatingsQuery),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const {
      search,
      artist,
      release,
      sortBy = 'newest',
      withComments = 'false'
    } = req.query;

    // Отключаем кэширование для актуальных данных
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const filters = {
      search: search as string,
      artist: artist as string,
      release: release as string,
      sortBy: sortBy as string,
      withComments: withComments === 'true'
    };

    const ratings = await services.ratings.getUserRatings(userId, filters);
    res.json(ratings);
  })
);

// Получение отзывов пользователя с фильтрацией и сортировкой
router.get('/:userId/comments', 
  rateLimits.general,
  validateParams(schemas.userId),
  validateQuery(schemas.userCommentsQuery),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const {
      search,
      artist,
      release,
      sortBy = 'newest'
    } = req.query;

    // Отключаем кэширование для актуальных данных
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const filters = {
      search: search as string,
      artist: artist as string,
      release: release as string,
      sortBy: sortBy as string
    };

    const comments = await services.comments.getUserComments(userId, filters);
    res.json(comments);
  })
);

// Получение статистики пользователя
router.get('/:userId/stats', 
  rateLimits.general,
  validateParams(schemas.userId),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Отключаем кэширование для актуальных данных
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const stats = await services.users.getUserStats(userId);
    res.json(stats);
  })
);

// Получение пользователя по ID (должен быть последним, чтобы не перехватывать другие роуты)
router.get('/:userId', 
  rateLimits.general,
  validateParams(schemas.userId),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Отключаем кэширование для актуальных данных
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const user = await services.users.getUser(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json(user);
  })
);

export default router;
