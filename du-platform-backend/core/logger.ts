type LogContext = Record<string, unknown>;

export type AppLogger = {
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
  child: (context: LogContext) => AppLogger;
};

function write(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: LogContext) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(context ?? {}),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

function createLogger(baseContext: LogContext = {}): AppLogger {
  const withContext = (context?: LogContext): LogContext => ({ ...baseContext, ...(context ?? {}) });

  return {
    info: (message, context) => write('info', message, withContext(context)),
    warn: (message, context) => write('warn', message, withContext(context)),
    error: (message, context) => write('error', message, withContext(context)),
    debug: (message, context) => {
      if ((process.env.NODE_ENV ?? 'development') !== 'production') {
        write('debug', message, withContext(context));
      }
    },
    child: (context) => createLogger(withContext(context)),
  };
}

export const logger = createLogger();
