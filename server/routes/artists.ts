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

// Получение всех исполнителей
router.get('/', 
  rateLimits.general,
  asyncHandler(async (req, res) => {
    const artists = await storage.getArtists();
    res.json(artists);
  })
);

// Поиск исполнителей
router.get('/search', 
  rateLimits.search,
  validateQuery(schemas.search),
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const artists = await storage.searchArtists(q);
    res.json(artists);
  })
);

// Получение релизов артиста (должен быть перед /:id)
router.get('/:id/releases', 
  rateLimits.general,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const releases = await storage.getReleasesByArtist(id);
    res.json(releases);
  })
);

// Получение исполнителя по ID
router.get('/:id', 
  rateLimits.general,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const artist = await storage.getArtist(id);
    
    if (!artist) {
      return res.status(404).json({ 
        success: false,
        message: "Artist not found" 
      });
    }
    
    res.json(artist);
  })
);

// Создание исполнителя (только для админов)
router.post('/', 
  requireAuth,
  requireAdmin,
  rateLimits.create,
  validateBody(schemas.createArtist),
  asyncHandler(async (req, res) => {
    const artist = await storage.createArtist(req.body);
    res.status(201).json(artist);
  })
);

export default router;
