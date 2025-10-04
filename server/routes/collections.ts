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

// Получение всех коллекций
router.get('/', 
  rateLimits.general,
  validateQuery(schemas.pagination.pick({ activeOnly: true })),
  asyncHandler(async (req, res) => {
    // Отключаем кэширование
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const activeOnly = req.query.activeOnly !== 'false';
    const collections = await services.collections.getCollections(activeOnly);
    
    // Сортируем по sort_order, затем по id
    const sortedCollections = collections.sort((a, b) => {
      const sortOrderDiff = (a.sort_order || 0) - (b.sort_order || 0);
      if (sortOrderDiff !== 0) return sortOrderDiff;
      return a.id - b.id;
    });
    
    res.json(sortedCollections);
  })
);

// Получение коллекции по ID
router.get('/:id', 
  rateLimits.general,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const collection = await services.collections.getCollection(id);
    res.json(collection);
  })
);

// Создание коллекции (только для админов)
router.post('/', 
  requireAuth,
  requireAdmin,
  rateLimits.create,
  validateBody(schemas.createCollection),
  asyncHandler(async (req: any, res) => {
    const { releaseIds, ...collectionData } = req.body;
    const validatedData = schemas.createCollection.parse(collectionData);
    
    // Создаем коллекцию с релизами
    const collection = await services.collections.createCollection({
      ...validatedData,
      releaseIds
    });
    
    res.status(201).json(collection);
  })
);

// Обновление коллекции (только для админов)
router.put('/:id', 
  requireAuth,
  requireAdmin,
  rateLimits.create,
  validateParams(schemas.id),
  validateBody(schemas.updateCollection),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { releaseIds, ...collectionData } = req.body;
    const validatedData = schemas.updateCollection.parse(collectionData);
    
    // Обновляем коллекцию с релизами
    const collection = await services.collections.updateCollection(id, {
      ...validatedData,
      releaseIds
    });
    
    res.json(collection);
  })
);

// Удаление коллекции (только для админов)
router.delete('/:id', 
  requireAuth,
  requireAdmin,
  rateLimits.create,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await services.collections.deleteCollection(id);
    res.status(204).send();
  })
);

// Добавление релиза в коллекцию (только для админов)
router.post('/:id/releases', 
  requireAuth,
  requireAdmin,
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

// Удаление релиза из коллекции (только для админов)
router.delete('/:id/releases/:releaseId', 
  requireAuth,
  requireAdmin,
  rateLimits.create,
  validateParams(schemas.id.extend({ releaseId: schemas.id.shape.id })),
  asyncHandler(async (req, res) => {
    const { id, releaseId } = req.params;
    await storage.removeReleaseFromCollection(id, releaseId);
    res.status(204).send();
  })
);

// Обновление порядка релиза в коллекции (только для админов)
router.put('/:id/releases/:releaseId/sort', 
  requireAuth,
  requireAdmin,
  rateLimits.create,
  validateParams(schemas.id.extend({ releaseId: schemas.id.shape.id })),
  validateBody(schemas.collectionRelease.pick({ sortOrder: true })),
  asyncHandler(async (req, res) => {
    const { id, releaseId } = req.params;
    const { sortOrder } = req.body;

    await storage.updateCollectionReleaseSortOrder(id, releaseId, sortOrder);
    res.status(204).send();
  })
);

export default router;
