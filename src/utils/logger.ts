export type LogLevel = "error" | "warn" | "info" | "debug";

type LogData = unknown;

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const LOG_COLORS = {
  error: "\x1b[31m",
  warn: "\x1b[33m",
  info: "\x1b[34m",
  debug: "\x1b[90m",
  reset: "\x1b[0m",
} as const;

class Logger {
  private level: LogLevel;
  private readonly context: string;

  constructor(context = "app") {
    const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
    this.level = envLevel && LOG_LEVELS[envLevel] !== undefined ? envLevel : "info";
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: LogData): string {
    const timestamp = new Date().toISOString();
    const color = LOG_COLORS[level];
    const reset = LOG_COLORS.reset;

    let formatted = `${color}[${timestamp}] [${level.toUpperCase()}] [${this.context}]${reset} ${message}`;

    if (data !== undefined) {
      formatted += `\n${JSON.stringify(data, null, 2)}`;
    }

    return formatted;
  }

  error(message: string, data?: LogData): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, data));
    }
  }

  warn(message: string, data?: LogData): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, data));
    }
  }

  info(message: string, data?: LogData): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message, data));
    }
  }

  debug(message: string, data?: LogData): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("debug", message, data));
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

export const logger = new Logger("app");
