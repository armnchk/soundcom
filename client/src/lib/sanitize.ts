import DOMPurify from 'dompurify';

/**
 * Санитизирует HTML контент для предотвращения XSS атак
 * @param html - HTML строка для санитизации
 * @returns Санитизированная HTML строка
 */
export function sanitizeHtml(html: string): string {
  // Конфигурация DOMPurify для максимальной безопасности
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'iframe', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown', 'onkeypress', 'onkeyup'],
  };

  return DOMPurify.sanitize(html, config);
}

/**
 * Санитизирует текст комментария, удаляя все HTML теги
 * @param text - Текст для санитизации
 * @returns Санитизированный текст без HTML
 */
export function sanitizeText(text: string): string {
  // Удаляем все HTML теги и экранируем специальные символы
  return text
    .replace(/<[^>]*>/g, '') // Удаляем все HTML теги
    .replace(/&/g, '&amp;')   // Экранируем амперсанд
    .replace(/</g, '&lt;')    // Экранируем меньше
    .replace(/>/g, '&gt;')    // Экранируем больше
    .replace(/"/g, '&quot;')  // Экранируем кавычки
    .replace(/'/g, '&#x27;')  // Экранируем апостроф
    .replace(/\//g, '&#x2F;'); // Экранируем слеш
}

/**
 * Проверяет, содержит ли текст потенциально опасный контент
 * @param text - Текст для проверки
 * @returns true если текст безопасен, false если содержит потенциальные угрозы
 */
export function isTextSafe(text: string): boolean {
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /<link[^>]*>.*?<\/link>/gi,
    /<style[^>]*>.*?<\/style>/gi,
    /<form[^>]*>.*?<\/form>/gi,
    /<input[^>]*>.*?<\/input>/gi,
    /<button[^>]*>.*?<\/button>/gi,
  ];

  return !dangerousPatterns.some(pattern => pattern.test(text));
}
