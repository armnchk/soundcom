/**
 * Утилиты для валидации и безопасной обработки изображений
 */

/**
 * Проверяет, является ли URL безопасным для изображений
 * @param url - URL для проверки
 * @returns true если URL безопасен, false если потенциально опасен
 */
export function isImageUrlSafe(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Проверяем протокол
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Проверяем домен на подозрительные паттерны
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
      /ftp:/i,
      /blob:/i,
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(url))) {
      return false;
    }
    
    // Проверяем расширение файла
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const hasImageExtension = imageExtensions.some(ext => 
      urlObj.pathname.toLowerCase().endsWith(ext)
    );
    
    // Если есть расширение, проверяем что это изображение
    if (urlObj.pathname.includes('.')) {
      return hasImageExtension;
    }
    
    // Если нет расширения, считаем безопасным (может быть API endpoint)
    return true;
    
  } catch (error) {
    // Если URL невалидный, считаем небезопасным
    return false;
  }
}

/**
 * Создает безопасный URL для изображения с проверками
 * @param url - Исходный URL
 * @param fallback - URL для замены в случае небезопасного URL
 * @returns Безопасный URL или fallback
 */
export function createSafeImageUrl(url: string, fallback?: string): string {
  if (!url) {
    return fallback || '/placeholder-image.png';
  }
  
  if (isImageUrlSafe(url)) {
    return url;
  }
  
  return fallback || '/placeholder-image.png';
}

/**
 * Проверяет, является ли URL изображением по MIME типу
 * @param url - URL для проверки
 * @returns Promise<boolean> - true если это изображение
 */
export async function isImageByMimeType(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    
    if (!contentType) {
      return false;
    }
    
    const imageMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/x-icon',
      'image/vnd.microsoft.icon'
    ];
    
    return imageMimeTypes.some(mimeType => 
      contentType.toLowerCase().includes(mimeType)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Создает безопасный атрибут src для img тега
 * @param url - Исходный URL
 * @param fallback - URL для замены
 * @returns Объект с безопасными атрибутами
 */
export function createSafeImageProps(url: string, fallback?: string) {
  const safeUrl = createSafeImageUrl(url, fallback);
  
  return {
    src: safeUrl,
    onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const target = e.target as HTMLImageElement;
      if (target.src !== fallback) {
        target.src = fallback || '/placeholder-image.png';
      }
    },
    loading: 'lazy' as const,
    decoding: 'async' as const,
  };
}
