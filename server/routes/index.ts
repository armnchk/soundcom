import { Express } from 'express';
import { createServer, Server } from 'http';
import { setupAuth } from '../googleAuth';
import { rateLimits } from '../middleware';

// Импорт всех роутов
import authRoutes from './auth';
import artistsRoutes from './artists';
import releasesRoutes from './releases';
import ratingsRoutes from './ratings';
import commentsRoutes from './comments';
import adminRoutes from './admin';
import collectionsRoutes from './collections';
import usersRoutes from './users';

export async function registerRoutes(app: Express): Promise<Server> {
  // Настройка аутентификации
  await setupAuth(app);

  // API роуты
  app.use('/api/auth', authRoutes);
  app.use('/api/artists', artistsRoutes);
  app.use('/api/releases', releasesRoutes);
  app.use('/api/ratings', ratingsRoutes);
  app.use('/api/comments', commentsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/collections', collectionsRoutes);
  app.use('/api/users', usersRoutes);

  // Дополнительные роуты для обратной совместимости
  app.get('/api/search', 
    rateLimits.search,
    (req, res) => {
      // Редирект на поиск релизов
      res.redirect(`/api/releases/search?q=${encodeURIComponent(req.query.q as string || '')}`);
    }
  );

  app.get('/api/search/artists', 
    rateLimits.search,
    (req, res) => {
      // Редирект на поиск исполнителей
      res.redirect(`/api/artists/search?q=${encodeURIComponent(req.query.q as string || '')}`);
    }
  );

  // Эндпоинт для получения CSRF токена
  app.get('/api/csrf-token', (req, res) => {
    res.json({
      success: true,
      token: res.locals.csrfToken,
      headerName: 'x-csrf-token'
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
