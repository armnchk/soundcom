import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: ValidationError[];
}

/**
 * Middleware для валидации тела запроса
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      req.body = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal validation error'
      });
    }
  };
};

/**
 * Middleware для валидации query параметров
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          message: 'Query validation failed',
          errors
        });
      }

      // Сохраняем валидированные данные в req.validatedQuery
      req.validatedQuery = result.data;
      next();
    } catch (error) {
      console.error('Query validation middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal validation error'
      });
    }
  };
};

/**
 * Middleware для валидации параметров URL
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          message: 'Parameter validation failed',
          errors
        });
      }

      req.params = result.data;
      next();
    } catch (error) {
      console.error('Params validation middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal validation error'
      });
    }
  };
};

/**
 * Универсальная функция валидации
 */
export const validate = (data: any, schema: ZodSchema): ValidationResult => {
  try {
    const result = schema.safeParse(data);
    
    if (!result.success) {
      const errors: ValidationError[] = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

      return {
        success: false,
        errors
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('Validation error:', error);
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: 'Internal validation error',
        code: 'INTERNAL_ERROR'
      }]
    };
  }
};
