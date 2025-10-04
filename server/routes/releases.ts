import { Router } from 'express';
import { storage } from '../storage';
import { ServiceContainer } from '../services';
import { 
  requireAuth, 
  requireAdmin,
  validateBody, 
  validateParams,
  validateQuery,
  schemas,
  rateLimits 
} from '../middleware';
import { asyncHandler } from '../middleware/errorHandler';


const services = new ServiceContainer(storage);

const router = Router();

// Простой тестовый эндпоинт
router.get('/health', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'API работает!' });
}));

// Получение релизов с фильтрами
router.get('/', 
  rateLimits.general,
  asyncHandler(async (req, res) => {
    try {
      const filters: any = { ...req.query };
      
      // Convert string parameters to appropriate types
      if (filters.artistId) {
        filters.artistId = parseInt(filters.artistId, 10);
      }
      if (filters.year) {
        filters.year = parseInt(filters.year, 10);
      }
      if (filters.includeTestData) {
        filters.includeTestData = filters.includeTestData === 'true';
      }
      
      const releases = await services.releases.getReleases(filters);
      res.json(releases);
    } catch (error) {
      console.error('Ошибка в получении релизов:', error);
      res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  })
);

// Получение релиза по ID
router.get('/:id', 
  rateLimits.general,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const release = await services.releases.getRelease(id);
    res.json(release);
  })
);

// Создание релиза (только для админов)
router.post('/', 
  requireAuth,
  requireAdmin,
  rateLimits.create,
  validateBody(schemas.createRelease),
  asyncHandler(async (req, res) => {
    const release = await services.releases.createRelease(req.body);
    res.status(201).json(release);
  })
);

// Обновление релиза (только для админов)
router.put('/:id', 
  requireAuth,
  requireAdmin,
  rateLimits.create,
  validateParams(schemas.id),
  validateBody(schemas.updateRelease),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const release = await services.releases.updateRelease(id, req.body);
    res.json(release);
  })
);

// Удаление релиза (только для админов)
router.delete('/:id', 
  requireAuth,
  requireAdmin,
  rateLimits.create,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await services.releases.deleteRelease(id);
    res.status(204).send();
  })
);

// Получение треков релиза
router.get('/:id/tracks', 
  rateLimits.general,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tracks = await services.releases.getReleaseTracks(id);
    res.json(tracks);
  })
);

// Поиск релизов
router.get('/search', 
  rateLimits.search,
  validateQuery(schemas.search.extend({ sortBy: schemas.ratingQuery.shape.sortBy })),
  asyncHandler(async (req, res) => {
    const { q, sortBy } = req.query;
    const releases = await services.releases.searchReleases(q, sortBy);
    res.json(releases);
  })
);

export default router;
