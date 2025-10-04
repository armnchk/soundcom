import { Router } from 'express';
import passport from 'passport';
import { storage } from '../storage';
import { 
  requireAuth, 
  validateBody, 
  schemas,
  rateLimits 
} from '../middleware';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Аутентификация через Google
router.get('/google', 
  rateLimits.auth,
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Callback для Google OAuth
router.get('/callback', 
  rateLimits.auth,
  passport.authenticate('google', {
    failureRedirect: '/login'
  }), 
  (req, res) => {
    res.redirect('/');
  }
);

// Выход из системы
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.redirect('/');
  });
});

// Получение данных пользователя
router.get('/user', 
  requireAuth,
  asyncHandler(async (req: any, res) => {
    // Отключаем кэширование
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const user = {
      id: req.user.id,
      google_id: req.user.claims.sub,
      email: req.user.claims.email,
      firstName: req.user.claims.first_name || req.user.claims.given_name || '',
      lastName: req.user.claims.last_name || req.user.claims.family_name || '',
      profileImageUrl: req.user.claims.picture || null,
      is_admin: req.user.is_admin || false,
      nickname: req.user.nickname || null
    };
    res.json(user);
  })
);

// Настройка никнейма
router.post('/nickname', 
  requireAuth,
  rateLimits.create,
  validateBody(schemas.nickname),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { nickname } = req.body;
    
    // Проверяем уникальность никнейма
    const isUnique = await storage.isNicknameUnique(nickname, userId);
    if (!isUnique) {
      return res.status(400).json({ 
        message: "Nickname already taken",
        code: "NICKNAME_TAKEN"
      });
    }

    const user = await storage.updateUserNickname(userId, nickname);
    res.json(user);
  })
);

// Тестовый эндпоинт для проверки сессии
router.get('/test-session', (req: any, res) => {
  res.json({
    session: req.session,
    user: req.user,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false
  });
});

export default router;
