import { config } from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Per-test structured logger.
 *
 * - Every entry is buffered and attached to the Allure result as
 *   `execution.log` (human readable) and `execution-log.json` (machine readable)
 *   by the evidence fixture, so nothing is lost even when stdout is quiet.
 * - Entries at or above `LOG_LEVEL` are echoed to stdout; allure-playwright also
 *   captures stdout into a "stdout" attachment.
 */
export class Logger {
  private readonly entries: LogEntry[] = [];

  constructor(
    private readonly context = 'test',
    private readonly echoLevel: LogLevel = config.logLevel,
  ) {}

  /** Returns a logger that shares this buffer but tags entries with a sub-context. */
  child(context: string): Logger {
    const child = new Logger(`${this.context}:${context}`, this.echoLevel);
    // Share the same buffer so child entries end up in the test's log.
    (child as unknown as { entries: LogEntry[] }).entries = this.entries;
    return child;
  }

  debug(message: string, data?: unknown): void {
    this.write('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.write('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.write('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.write('error', message, data);
  }

  /** Log a named value — useful for recording test data and variables. */
  data(label: string, value: unknown): void {
    this.write('info', `DATA ${label}`, value);
  }

  getEntries(): readonly LogEntry[] {
    return this.entries;
  }

  countByLevel(level: LogLevel): number {
    return this.entries.filter((e) => e.level === level).length;
  }

  /** Plain-text rendering used for the `execution.log` attachment. */
  toText(): string {
    return this.entries
      .map((e) => {
        const line = `${e.timestamp} [${e.level.toUpperCase().padEnd(5)}] (${e.context}) ${e.message}`;
        return e.data === undefined ? line : `${line}\n    ${Logger.stringify(e.data).replace(/\n/g, '\n    ')}`;
      })
      .join('\n');
  }

  private write(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...(data === undefined ? {} : { data }),
    };
    this.entries.push(entry);

    if (LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[this.echoLevel]) {
      const suffix = data === undefined ? '' : ` ${Logger.stringify(data, 0)}`;
      const out = `[${level.toUpperCase()}] (${this.context}) ${message}${suffix}`;
      if (level === 'error' || level === 'warn') console.error(out);
      else console.log(out);
    }
  }

  private static stringify(value: unknown, indent = 2): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value, null, indent);
    } catch {
      return String(value);
    }
  }
}
