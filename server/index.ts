import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
  rateLimits,
  csrfInit,
  csrfProtection,
  clearRateLimitStore
} from "./middleware";

// Обработка необработанных промисов и исключений
process.on('unhandledRejection', unhandledRejectionHandler);
process.on('uncaughtException', uncaughtExceptionHandler);

const app = express();

// Trust proxy для правильной работы с reverse proxy
app.set('trust proxy', 1);

// Парсинг JSON и URL-encoded данных
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Логирование запросов
app.use(requestLogger);

// Rate limiting для всех API запросов
app.use('/api', rateLimits.general);

// CSRF защита (инициализация)
app.use(csrfInit());

// CSRF защита для API (кроме GET запросов)
app.use('/api', csrfProtection());

(async () => {
  const server = await registerRoutes(app);

  // Эндпоинт для очистки rate limiting в режиме разработки
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/dev/clear-rate-limit', (req: Request, res: Response) => {
      clearRateLimitStore();
      res.json({ success: true, message: 'Rate limit store cleared' });
    });
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Обработка 404 ошибок (после настройки статических файлов)
  app.use(notFoundHandler);

  // Централизованная обработка ошибок
  app.use(errorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Scheduler removed
  });
})();
