/**
 * Структурированное логирование безопасности
 */

export enum SecurityEventType {
  AUTHENTICATION_SUCCESS = 'auth_success',
  AUTHENTICATION_FAILURE = 'auth_failure',
  AUTHORIZATION_FAILURE = 'authz_failure',
  CSRF_VIOLATION = 'csrf_violation',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  SUSPICIOUS_REQUEST = 'suspicious_request',
  DATA_ACCESS_VIOLATION = 'data_access_violation',
  FILE_UPLOAD_VIOLATION = 'file_upload_violation',
  API_ABUSE = 'api_abuse',
  SESSION_HIJACK_ATTEMPT = 'session_hijack_attempt',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration'
}

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  url?: string;
  method?: string;
  requestId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  riskScore?: number; // 0-100
}

export class SecurityLogger {
  private static instance: SecurityLogger;
  
  private constructor() {}
  
  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }
  
  /**
   * Логирует событие безопасности
   */
  public log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    
    // Определяем уровень логирования на основе severity
    const logLevel = this.getLogLevel(securityEvent.severity);
    
    // Форматируем сообщение для логов
    const logMessage = this.formatLogMessage(securityEvent);
    
    // Выводим в консоль с соответствующим уровнем
    switch (logLevel) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      default:
        console.log(logMessage);
    }
    
    // В продакшене можно добавить отправку в внешние системы мониторинга
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(securityEvent);
    }
  }
  
  /**
   * Логирует попытку аутентификации
   */
  public logAuthAttempt(
    success: boolean, 
    userId: string | undefined, 
    ip: string, 
    userAgent?: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      type: success ? SecurityEventType.AUTHENTICATION_SUCCESS : SecurityEventType.AUTHENTICATION_FAILURE,
      severity: success ? 'low' : 'medium',
      message: success ? 'Successful authentication' : 'Failed authentication attempt',
      userId,
      ip,
      userAgent,
      metadata
    });
  }
  
  /**
   * Логирует нарушение авторизации
   */
  public logAuthorizationFailure(
    userId: string | undefined,
    ip: string,
    resource: string,
    action: string,
    userAgent?: string
  ): void {
    this.log({
      type: SecurityEventType.AUTHORIZATION_FAILURE,
      severity: 'high',
      message: `Unauthorized access attempt to ${resource} for action ${action}`,
      userId,
      ip,
      userAgent,
      metadata: { resource, action }
    });
  }
  
  /**
   * Логирует CSRF нарушение
   */
  public logCSRFViolation(
    ip: string,
    url: string,
    method: string,
    userAgent?: string,
    userId?: string
  ): void {
    this.log({
      type: SecurityEventType.CSRF_VIOLATION,
      severity: 'high',
      message: 'CSRF token validation failed',
      userId,
      ip,
      userAgent,
      url,
      method,
      metadata: { csrfToken: 'REDACTED' }
    });
  }
  
  /**
   * Логирует превышение лимитов запросов
   */
  public logRateLimitExceeded(
    ip: string,
    endpoint: string,
    limit: number,
    userAgent?: string,
    userId?: string
  ): void {
    this.log({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: 'medium',
      message: `Rate limit exceeded for endpoint ${endpoint}`,
      userId,
      ip,
      userAgent,
      url: endpoint,
      metadata: { limit, endpoint }
    });
  }
  
  /**
   * Логирует попытку XSS атаки
   */
  public logXSSAttempt(
    ip: string,
    input: string,
    url: string,
    userAgent?: string,
    userId?: string
  ): void {
    this.log({
      type: SecurityEventType.XSS_ATTEMPT,
      severity: 'high',
      message: 'Potential XSS attack detected',
      userId,
      ip,
      userAgent,
      url,
      metadata: { 
        suspiciousInput: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
        inputLength: input.length
      }
    });
  }
  
  /**
   * Логирует нарушение доступа к данным
   */
  public logDataAccessViolation(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    ip: string,
    userAgent?: string
  ): void {
    this.log({
      type: SecurityEventType.DATA_ACCESS_VIOLATION,
      severity: 'high',
      message: `Unauthorized data access attempt: ${action} on ${resourceType}:${resourceId}`,
      userId,
      ip,
      userAgent,
      metadata: { resourceType, resourceId, action }
    });
  }
  
  /**
   * Логирует подозрительную активность
   */
  public logSuspiciousActivity(
    type: SecurityEventType,
    message: string,
    ip: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    userId?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): void {
    this.log({
      type,
      severity,
      message,
      userId,
      ip,
      userAgent,
      metadata
    });
  }
  
  private getLogLevel(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'log';
    }
  }
  
  private formatLogMessage(event: SecurityEvent): string {
    const baseMessage = `[SECURITY] ${event.type.toUpperCase()}: ${event.message}`;
    const details = [
      `Severity: ${event.severity}`,
      `IP: ${event.ip}`,
      `User: ${event.userId || 'anonymous'}`,
      `Timestamp: ${event.timestamp}`
    ];
    
    if (event.url) details.push(`URL: ${event.url}`);
    if (event.method) details.push(`Method: ${event.method}`);
    if (event.requestId) details.push(`Request ID: ${event.requestId}`);
    if (event.riskScore) details.push(`Risk Score: ${event.riskScore}`);
    
    return `${baseMessage}\n${details.join(' | ')}`;
  }
  
  private sendToMonitoring(event: SecurityEvent): void {
    // Здесь можно добавить интеграцию с системами мониторинга
    // Например, отправка в Sentry, DataDog, CloudWatch и т.д.
    
    // Для критических событий можно добавить алерты
    if (event.severity === 'critical') {
      // Отправка уведомлений администраторам
      console.error('CRITICAL SECURITY EVENT - IMMEDIATE ATTENTION REQUIRED:', event);
    }
  }
}

// Экспортируем singleton instance
export const securityLogger = SecurityLogger.getInstance();
