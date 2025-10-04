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

// Получение комментариев релиза
router.get('/releases/:id', 
  rateLimits.general,
  validateParams(schemas.id),
  validateQuery(schemas.commentQuery),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { sortBy } = req.query;
    const comments = await storage.getComments(id, sortBy);
    res.json(comments);
  })
);

// Создание комментария
router.post('/releases/:id', 
  requireAuth,
  rateLimits.comments,
  validateParams(schemas.id),
  validateBody(schemas.createComment),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const { text, rating } = req.body;

    // Проверяем, есть ли уже комментарий от этого пользователя
    const existingComment = await storage.getUserCommentForRelease(userId, id);
    if (existingComment) {
      return res.status(400).json({ 
        success: false,
        message: "You have already commented on this release. You can only edit your existing comment.",
        code: "COMMENT_EXISTS"
      });
    }

    const comment = await storage.createComment({
      user_id: userId,
      release_id: id,
      text: text.trim(),
      rating: rating,
    });
    
    res.status(201).json(comment);
  })
);

// Обновление комментария
router.put('/:id', 
  requireAuth,
  rateLimits.comments,
  validateParams(schemas.id),
  validateBody(schemas.updateComment),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const { text, rating } = req.body;

    // Проверяем, что комментарий принадлежит текущему пользователю
    const existingComment = await storage.getCommentById(id);
    if (!existingComment) {
      return res.status(404).json({ 
        success: false,
        message: "Comment not found",
        code: "COMMENT_NOT_FOUND"
      });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ 
        success: false,
        message: "You can only edit your own comments",
        code: "FORBIDDEN"
      });
    }

    const comment = await storage.updateComment(id, { 
      text: text.trim(), 
      rating: rating 
    });
    
    res.json(comment);
  })
);

// Удаление комментария
router.delete('/:id', 
  requireAuth,
  rateLimits.comments,
  validateParams(schemas.id),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    // Проверяем, что комментарий принадлежит текущему пользователю
    const existingComment = await storage.getCommentById(id);
    if (!existingComment) {
      return res.status(404).json({ 
        success: false,
        message: "Comment not found",
        code: "COMMENT_NOT_FOUND"
      });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ 
        success: false,
        message: "You can only delete your own comments",
        code: "FORBIDDEN"
      });
    }

    await storage.deleteComment(id);
    res.status(204).send();
  })
);

// Реакции на комментарии
router.post('/:id/react', 
  requireAuth,
  rateLimits.comments,
  validateParams(schemas.id),
  validateBody(schemas.createReaction),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const { reactionType } = req.body;

    const reaction = await storage.upsertCommentReaction({ 
      commentId: id, 
      userId, 
      reactionType 
    });
    
    res.json(reaction);
  })
);

// Удаление реакции
router.delete('/:id/react', 
  requireAuth,
  rateLimits.comments,
  validateParams(schemas.id),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    await storage.deleteCommentReaction(id, userId);
    res.status(204).send();
  })
);

// Жалобы на комментарии
router.post('/:id/report', 
  requireAuth,
  rateLimits.reports,
  validateParams(schemas.id),
  validateBody(schemas.createReport),
  asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    const { reason } = req.body;

    const report = await storage.createReport({ 
      commentId: id, 
      reportedBy: userId, 
      reason 
    });
    
    res.status(201).json(report);
  })
);

// Получение комментариев пользователя
router.get('/users/:id', 
  rateLimits.general,
  validateParams(schemas.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const comments = await storage.getUserComments(id);
    res.json(comments);
  })
);

export default router;
