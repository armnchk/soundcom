import { Router } from 'express';
import { storage } from '../storage';
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

const router = Router();

// Все админские роуты требуют аутентификации и админских прав
router.use(requireAuth);
router.use(requireAdmin);

// Получение релизов с фильтрами для админки
router.get('/releases', 
  rateLimits.general,
  validateQuery(schemas.adminReleaseFiltersSchema),
  asyncHandler(async (req, res) => {
    const params = {
      page: req.query.page as number,
      limit: req.query.limit as number,
      search: req.query.search as string,
      type: req.query.type as string,
      artist: req.query.artist as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      showTestData: req.query.showTestData as boolean
    };

    const result = await storage.getReleasesWithFilters(params);
    res.json(result);
  })
);

// Получение жалоб
router.get('/reports', 
  rateLimits.general,
  validateQuery(schemas.updateReport.pick({ status: true })),
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const reports = await storage.getReports(status as string);
    res.json(reports);
  })
);

// Обновление статуса жалобы
router.put('/reports/:id', 
  rateLimits.create,
  validateParams(schemas.id),
  validateBody(schemas.updateReport),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const report = await storage.updateReportStatus(id, status);
    res.json(report);
  })
);

// Получение коллекций для админки
router.get('/collections', 
  rateLimits.general,
  asyncHandler(async (req, res) => {
    const collections = await storage.getCollections(false); // Все коллекции
    res.json(collections);
  })
);

// Создание коллекции
router.post('/collections', 
  rateLimits.create,
  validateBody(schemas.createCollection),
  asyncHandler(async (req: any, res) => {
    const collection = await storage.createCollection({
      ...req.body,
      user_id: req.user.id
    });
    res.status(201).json(collection);
  })
);

// Обновление коллекции
router.put('/collections/:id', 
  rateLimits.create,
  validateParams(schemas.id),
  validateBody(schemas.updateCollection),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Проверяем минимальное количество релизов для активации
    if (updates.is_active === true) {
      const collection = await storage.getCollection(id);
      if (!collection || (collection.releases?.length || 0) < 5) {
        return res.status(400).json({ 
          success: false,
          message: "Collection must have at least 5 releases to be activated" 
        });
      }
    }
    
    const updatedCollection = await storage.updateCollection(id, updates);
    res.json(updatedCollection);
  })
);

// Удаление коллекции
router.delete('/collections/:id', 
  rateLimits.create,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await storage.deleteCollection(id);
    res.status(204).send();
  })
);

// Добавление релиза в коллекцию
router.post('/collections/:id/releases', 
  rateLimits.create,
  validateParams(schemas.id),
  validateBody(schemas.collectionRelease),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { releaseId, sortOrder } = req.body;

    const collectionRelease = await storage.addReleaseToCollection(id, releaseId, sortOrder);
    res.status(201).json(collectionRelease);
  })
);

// Удаление релиза из коллекции
router.delete('/collections/:id/releases/:releaseId', 
  rateLimits.create,
  validateParams(schemas.id.extend({ releaseId: schemas.id.shape.id })),
  asyncHandler(async (req, res) => {
    const { id, releaseId } = req.params;
    await storage.removeReleaseFromCollection(id, releaseId);
    res.status(204).send();
  })
);

// Получение статистики импорта
router.get('/import/stats', 
  rateLimits.general,
  asyncHandler(async (req, res) => {
    const stats = await storage.getImportStats();
    res.json(stats);
  })
);

// Получение логов импорта
router.get('/import/logs', 
  rateLimits.general,
  validateQuery(schemas.pagination.pick({ limit: true })),
  asyncHandler(async (req, res) => {
    const limit = req.query.limit as number || 20;
    const logs = await storage.getImportLogs(limit);
    res.json(logs);
  })
);

// Получение последнего лога импорта
router.get('/import/logs/latest', 
  rateLimits.general,
  asyncHandler(async (req, res) => {
    const latestLog = await storage.getLatestImportLog();
    res.json(latestLog || null);
  })
);

export default router;
