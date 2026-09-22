import type { ConsoleMessage, Page } from '@playwright/test';
import { AllureHelper, toHtmlTable } from './allure-helper';
import type { Logger } from './logger';

export interface ConsoleEntry {
  timestamp: string;
  type: string;
  text: string;
  location?: string;
  pageUrl: string;
}

export interface ConsoleSummary {
  total: number;
  errors: number;
  warnings: number;
  pageErrors: number;
  byType: Record<string, number>;
}

/**
 * Captures browser console output and uncaught page errors (`pageerror`).
 * The evidence fixture attaches the result to every test.
 */
export class ConsoleMonitor {
  private readonly messages: ConsoleEntry[] = [];
  private readonly pageErrors: ConsoleEntry[] = [];

  constructor(
    private readonly page: Page,
    private readonly logger?: Logger,
  ) {}

  start(): void {
    this.page.on('console', this.onConsole);
    this.page.on('pageerror', this.onPageError);
  }

  stop(): void {
    this.page.off('console', this.onConsole);
    this.page.off('pageerror', this.onPageError);
  }

  all(): readonly ConsoleEntry[] {
    return this.messages;
  }

  errors(ignore: RegExp[] = []): ConsoleEntry[] {
    return [...this.messages.filter((m) => m.type === 'error'), ...this.pageErrors].filter(
      (m) => !ignore.some((re) => re.test(m.text)),
    );
  }

  warnings(): ConsoleEntry[] {
    return this.messages.filter((m) => m.type === 'warning');
  }

  getPageErrors(): readonly ConsoleEntry[] {
    return this.pageErrors;
  }

  summary(): ConsoleSummary {
    return {
      total: this.messages.length,
      errors: this.messages.filter((m) => m.type === 'error').length,
      warnings: this.warnings().length,
      pageErrors: this.pageErrors.length,
      byType: this.messages.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.type]: (acc[m.type] ?? 0) + 1 }), {}),
    };
  }

  async attachToAllure(): Promise<void> {
    const all = [...this.messages, ...this.pageErrors].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (all.length === 0) return;

    await AllureHelper.attachText(
      `🖥️ Browser console (${all.length} messages)`,
      all.map((m) => `${m.timestamp} [${m.type.toUpperCase()}] ${m.text}${m.location ? `  @ ${m.location}` : ''}`).join('\n'),
    );

    const problems = all.filter((m) => m.type === 'error' || m.type === 'pageerror' || m.type === 'warning');
    if (problems.length) {
      await AllureHelper.attachHtml(
        `⚠️ Console errors & warnings (${problems.length})`,
        toHtmlTable(
          'Console errors & warnings',
          problems.map((m) => ({ time: m.timestamp.slice(11, 23), type: m.type, message: m.text, source: m.location ?? '', page: m.pageUrl })),
          (r) => (r.type === 'warning' ? '#fef9c3' : '#fee2e2'),
        ),
      );
    }
  }

  private readonly onConsole = (msg: ConsoleMessage): void => {
    const loc = msg.location();
    const entry: ConsoleEntry = {
      timestamp: new Date().toISOString(),
      type: msg.type(),
      text: msg.text(),
      location: loc.url ? `${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : undefined,
      pageUrl: this.page.url(),
    };
    this.messages.push(entry);
    if (entry.type === 'error') this.logger?.debug(`console.error: ${entry.text}`);
  };

  private readonly onPageError = (error: Error): void => {
    const entry: ConsoleEntry = {
      timestamp: new Date().toISOString(),
      type: 'pageerror',
      text: `${error.name}: ${error.message}`,
      location: error.stack?.split('\n')[1]?.trim(),
      pageUrl: this.page.url(),
    };
    this.pageErrors.push(entry);
    this.logger?.warn(`Uncaught page error: ${entry.text}`);
  };
}
