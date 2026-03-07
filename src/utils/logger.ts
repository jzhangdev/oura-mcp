export type LogLevel = "error" | "warn" | "info" | "debug";

type LogData = unknown;
type LogSink = "stdout" | "stderr";

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

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function isMcpStdioMode(): boolean {
  return isTruthy(process.env.MCP_STDIO_MODE);
}

function shouldUseColors(): boolean {
  if (isMcpStdioMode()) {
    return false;
  }

  if (process.env.NO_COLOR !== undefined) {
    return false;
  }

  if (process.env.FORCE_COLOR !== undefined) {
    return !["0", "false"].includes(process.env.FORCE_COLOR.toLowerCase());
  }

  return Boolean(process.stderr.isTTY);
}

function resolveSink(): LogSink {
  if (isMcpStdioMode()) {
    return "stderr";
  }

  return isTruthy(process.env.LOG_STDOUT) ? "stdout" : "stderr";
}

class Logger {
  private level: LogLevel;
  private readonly context: string;
  private readonly useColors: boolean;
  private readonly sink: LogSink;

  constructor(context = "app") {
    const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
    this.level = envLevel && LOG_LEVELS[envLevel] !== undefined ? envLevel : "info";
    this.context = context;
    this.useColors = shouldUseColors();
    this.sink = resolveSink();
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  private formatPrefix(level: LogLevel, timestamp: string): string {
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;

    if (!this.useColors) {
      return prefix;
    }

    const color = LOG_COLORS[level];
    const reset = LOG_COLORS.reset;
    return `${color}${prefix}${reset}`;
  }

  private formatMessage(level: LogLevel, message: string, data?: LogData): string {
    const timestamp = new Date().toISOString();
    let formatted = `${this.formatPrefix(level, timestamp)} ${message}`;

    if (data !== undefined) {
      formatted += `\n${JSON.stringify(data, null, 2)}`;
    }

    return formatted;
  }

  private write(message: string): void {
    if (this.sink === "stdout") {
      process.stdout.write(`${message}\n`);
      return;
    }

    process.stderr.write(`${message}\n`);
  }

  error(message: string, data?: LogData): void {
    if (this.shouldLog("error")) {
      this.write(this.formatMessage("error", message, data));
    }
  }

  warn(message: string, data?: LogData): void {
    if (this.shouldLog("warn")) {
      this.write(this.formatMessage("warn", message, data));
    }
  }

  info(message: string, data?: LogData): void {
    if (this.shouldLog("info")) {
      this.write(this.formatMessage("info", message, data));
    }
  }

  debug(message: string, data?: LogData): void {
    if (this.shouldLog("debug")) {
      this.write(this.formatMessage("debug", message, data));
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
