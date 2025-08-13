type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = process.env.NODE_ENV === 'development';
  private debugEnabled = process.env.DEBUG === 'true';

  private log(level: LogLevel, message: string, data?: any) {
    if (level === 'debug' && !this.debugEnabled) return;

    const timestamp = new Date().toISOString();
    const prefix = this.getPrefix(level);
    
    if (data !== undefined) {
      console[level === 'debug' ? 'log' : level](
        `${prefix} [${timestamp}] ${message}`,
        data
      );
    } else {
      console[level === 'debug' ? 'log' : level](
        `${prefix} [${timestamp}] ${message}`
      );
    }
  }

  private getPrefix(level: LogLevel): string {
    switch (level) {
      case 'debug': return '🐛 [DEBUG]';
      case 'info': return 'ℹ️  [INFO]';
      case 'warn': return '⚠️  [WARN]';
      case 'error': return '❌ [ERROR]';
      default: return '[LOG]';
    }
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: any) {
    if (error instanceof Error) {
      this.log('error', message, {
        message: error.message,
        stack: this.isDev ? error.stack : undefined
      });
    } else {
      this.log('error', message, error);
    }
  }
}

export const logger = new Logger(); 