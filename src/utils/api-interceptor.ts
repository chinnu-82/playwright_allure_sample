import type { Page, Request, Response, Route } from '@playwright/test';
import { AllureHelper, toCsv, toHtmlTable } from './allure-helper';
import type { Logger } from './logger';

export interface NetworkEntry {
  id: number;
  method: string;
  url: string;
  resourceType: string;
  firstParty: boolean;
  startedAt: string;
  status?: number;
  statusText?: string;
  durationMs?: number;
  /** `failed` = transport error, `http-error` = 4xx/5xx, `ok` otherwise. */
  outcome: 'pending' | 'ok' | 'http-error' | 'failed';
  failure?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  mocked?: boolean;
}

export interface NetworkSummary {
  total: number;
  firstParty: number;
  apiCalls: number;
  failed: number;
  httpErrors: number;
  slow: number;
  averageMs: number;
  p95Ms: number;
  slowestUrl?: string;
  byResourceType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface ApiInterceptorOptions {
  baseURL: string;
  slowThresholdMs: number;
  /** Resource types whose request/response bodies are captured (first-party only). */
  captureBodiesFor?: string[];
  /** Bodies longer than this are truncated in the report. */
  maxBodyLength?: number;
}

/** Headers never written to the report. */
const REDACTED_HEADERS = /^(cookie|set-cookie|authorization|x-shopify-.*token.*)$/i;

/**
 * Records every HTTP exchange a page makes and turns it into Allure evidence:
 * a JSON log, a CSV export, an HTML table and a summary with timings.
 * Also offers mocking helpers to simulate backend failures.
 */
export class ApiInterceptor {
  private readonly entries: NetworkEntry[] = [];
  private readonly byRequest = new Map<Request, NetworkEntry>();
  private readonly pending: Array<Promise<void>> = [];
  private readonly host: string;
  private nextId = 1;
  private started = false;

  constructor(
    private readonly page: Page,
    private readonly options: ApiInterceptorOptions,
    private readonly logger?: Logger,
  ) {
    this.host = new URL(options.baseURL).host;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.page.on('request', this.onRequest);
    this.page.on('response', this.onResponse);
    this.page.on('requestfinished', this.onFinished);
    this.page.on('requestfailed', this.onFailed);
  }

  /** Detach listeners and wait for in-flight body captures. */
  async stop(): Promise<void> {
    if (!this.started) return;
    this.page.off('request', this.onRequest);
    this.page.off('response', this.onResponse);
    this.page.off('requestfinished', this.onFinished);
    this.page.off('requestfailed', this.onFailed);
    this.started = false;
    await Promise.allSettled(this.pending);
  }

  // ---------------------------------------------------------------- queries

  all(): readonly NetworkEntry[] {
    return this.entries;
  }

  /** XHR / fetch calls to the application's own backend. */
  apiCalls(): NetworkEntry[] {
    return this.entries.filter((e) => e.firstParty && (e.resourceType === 'xhr' || e.resourceType === 'fetch'));
  }

  failed(): NetworkEntry[] {
    return this.entries.filter((e) => e.outcome === 'failed' || e.outcome === 'http-error');
  }

  slow(): NetworkEntry[] {
    return this.entries.filter((e) => (e.durationMs ?? 0) > this.options.slowThresholdMs);
  }

  find(urlPart: string | RegExp): NetworkEntry[] {
    return this.entries.filter((e) => (typeof urlPart === 'string' ? e.url.includes(urlPart) : urlPart.test(e.url)));
  }

  summary(): NetworkSummary {
    const durations = this.entries.map((e) => e.durationMs).filter((d): d is number => typeof d === 'number').sort((a, b) => a - b);
    const slowest = [...this.entries].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];
    const count = (key: (e: NetworkEntry) => string): Record<string, number> =>
      this.entries.reduce<Record<string, number>>((acc, e) => ({ ...acc, [key(e)]: (acc[key(e)] ?? 0) + 1 }), {});
    return {
      total: this.entries.length,
      firstParty: this.entries.filter((e) => e.firstParty).length,
      apiCalls: this.apiCalls().length,
      failed: this.entries.filter((e) => e.outcome === 'failed').length,
      httpErrors: this.entries.filter((e) => e.outcome === 'http-error').length,
      slow: this.slow().length,
      averageMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      p95Ms: durations.length ? Math.round(durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))]) : 0,
      slowestUrl: slowest?.durationMs ? `${Math.round(slowest.durationMs)}ms ${slowest.url}` : undefined,
      byResourceType: count((e) => e.resourceType),
      byStatus: count((e) => (e.status ? String(e.status) : e.outcome)),
    };
  }

  // ---------------------------------------------------------------- mocking

  /** Answer matching requests with a canned JSON body. */
  async mockJson(url: string | RegExp, body: unknown, status = 200): Promise<void> {
    this.logger?.info(`Mocking ${String(url)} -> HTTP ${status}`);
    await this.page.route(url, (route: Route) => {
      this.markMocked(route.request());
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
  }

  /** Make matching requests fail at the transport level (simulates an outage). */
  async simulateNetworkFailure(url: string | RegExp, errorCode: 'failed' | 'connectionrefused' | 'timedout' = 'failed'): Promise<void> {
    this.logger?.warn(`Simulating network failure (${errorCode}) for ${String(url)}`);
    await this.page.route(url, (route: Route) => {
      this.markMocked(route.request());
      return route.abort(errorCode);
    });
  }

  /** Delay matching requests to simulate a slow backend. */
  async simulateLatency(url: string | RegExp, delayMs: number): Promise<void> {
    this.logger?.info(`Adding ${delayMs}ms latency to ${String(url)}`);
    await this.page.route(url, async (route: Route) => {
      await new Promise((r) => setTimeout(r, delayMs));
      await route.continue();
    });
  }

  // ---------------------------------------------------------------- reporting

  /**
   * Attach the network evidence to the current Allure test.
   * `full` also attaches the complete JSON/CSV logs, not just the summary.
   */
  async attachToAllure(options: { full?: boolean } = {}): Promise<void> {
    if (this.entries.length === 0) return;
    const summary = this.summary();
    await AllureHelper.attachJson('🌐 Network summary', summary);

    const rows = this.entries
      .filter((e) => e.firstParty || e.outcome !== 'ok')
      .map((e) => ({
        '#': e.id,
        method: e.method,
        status: e.status ?? e.outcome,
        'time (ms)': e.durationMs === undefined ? '' : Math.round(e.durationMs),
        type: e.resourceType,
        url: e.url,
        note: [e.mocked ? 'mocked' : '', e.failure ?? '', (e.durationMs ?? 0) > this.options.slowThresholdMs ? 'SLOW' : '']
          .filter(Boolean)
          .join(' '),
      }));
    await AllureHelper.attachHtml(
      '🌐 Network log (first-party + failures)',
      toHtmlTable(`HTTP traffic — ${summary.total} requests, avg ${summary.averageMs}ms, p95 ${summary.p95Ms}ms`, rows, (r) => {
        const status = r.status;
        if (typeof status === 'number' && status >= 400) return '#fee2e2';
        if (status === 'failed') return '#fee2e2';
        if (String(r.note).includes('SLOW')) return '#fef9c3';
        return undefined;
      }),
    );

    const api = this.apiCalls();
    if (api.length) await AllureHelper.attachJson(`🔌 API calls with payloads (${api.length})`, api);

    const failed = this.failed();
    if (failed.length) await AllureHelper.attachJson(`❌ Failed network requests (${failed.length})`, failed);

    if (options.full) {
      await AllureHelper.attachCsv('network-log.csv', this.entries.map(({ requestHeaders, responseHeaders, requestBody, responseBody, ...rest }) => rest));
    }
  }

  toCsv(): string {
    return toCsv(this.entries.map(({ requestHeaders, responseHeaders, requestBody, responseBody, ...rest }) => rest));
  }

  // ---------------------------------------------------------------- listeners

  private readonly onRequest = (request: Request): void => {
    let firstParty = false;
    try {
      firstParty = new URL(request.url()).host === this.host;
    } catch {
      /* data: / blob: urls */
    }
    const entry: NetworkEntry = {
      id: this.nextId++,
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
      firstParty,
      startedAt: new Date().toISOString(),
      outcome: 'pending',
    };
    if (this.shouldCaptureBody(entry)) {
      entry.requestHeaders = redact(request.headers());
      entry.requestBody = this.truncate(request.postData() ?? undefined);
    }
    this.entries.push(entry);
    this.byRequest.set(request, entry);
  };

  private readonly onResponse = (response: Response): void => {
    const entry = this.byRequest.get(response.request());
    if (!entry) return;
    entry.status = response.status();
    entry.statusText = response.statusText();
    entry.outcome = response.status() >= 400 ? 'http-error' : 'ok';
    if (entry.outcome === 'http-error') {
      this.logger?.warn(`HTTP ${entry.status} ${entry.method} ${entry.url}`);
    }
    if (this.shouldCaptureBody(entry)) {
      entry.responseHeaders = redact(response.headers());
      this.pending.push(
        response
          .text()
          .then((body) => {
            entry.responseBody = this.truncate(body);
          })
          .catch(() => {
            entry.responseBody = '<body unavailable (redirect or page closed)>';
          }),
      );
    }
  };

  private readonly onFinished = (request: Request): void => {
    const entry = this.byRequest.get(request);
    if (!entry) return;
    entry.durationMs = responseTime(request, entry);
  };

  private readonly onFailed = (request: Request): void => {
    const entry = this.byRequest.get(request);
    if (!entry) return;
    entry.outcome = 'failed';
    entry.failure = request.failure()?.errorText ?? 'unknown';
    entry.durationMs = responseTime(request, entry);
    // Aborted analytics beacons are common noise; only first-party failures are warnings.
    const log = entry.firstParty && !/ERR_ABORTED/.test(entry.failure) ? this.logger?.warn : this.logger?.debug;
    log?.call(this.logger, `Request failed: ${entry.method} ${entry.url} (${entry.failure})`);
  };

  private shouldCaptureBody(entry: NetworkEntry): boolean {
    const types = this.options.captureBodiesFor ?? ['xhr', 'fetch'];
    return entry.firstParty && types.includes(entry.resourceType);
  }

  private markMocked(request: Request): void {
    const entry = this.byRequest.get(request);
    if (entry) entry.mocked = true;
  }

  private truncate(body: string | undefined): string | undefined {
    const max = this.options.maxBodyLength ?? 4_000;
    if (body === undefined) return undefined;
    return body.length > max ? `${body.slice(0, max)}… [truncated ${body.length - max} chars]` : body;
  }
}

function responseTime(request: Request, entry: NetworkEntry): number {
  const timing = request.timing();
  if (timing.responseEnd > 0) return Math.round(timing.responseEnd * 10) / 10;
  return Date.now() - Date.parse(entry.startedAt);
}

function redact(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, REDACTED_HEADERS.test(k) ? '<redacted>' : v]));
}
