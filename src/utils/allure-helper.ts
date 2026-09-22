import type { Locator, Page } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ContentType, Severity, Status } from 'allure-js-commons';
import { config } from '../config';

export { allure, ContentType, Severity, Status };

/** Everything that describes a test in the report, applied with one call. */
export interface TestMetadata {
  epic?: string;
  feature?: string;
  story?: string;
  severity?: Severity | `${Severity}`;
  owner?: string;
  /** Tags appear as chips and can be filtered. Leading `@` is optional. */
  tags?: string[];
  /** Markdown description (rendered in the "Description" block). */
  description?: string;
  /** Raw HTML description; takes precedence over `description` in the UI. */
  descriptionHtml?: string;
  /** Issue ids resolved through the `issue` link template in allure-report.config.ts. */
  issues?: string[];
  /** Test-management ids resolved through the `tms` link template. */
  tms?: string[];
  /** Arbitrary links: documentation, specs, dashboards, related tests… */
  links?: Array<{ url: string; name?: string; type?: string }>;
  /** Test layer: e2e, api, ui, component, unit… (shown in "Packages"/filters). */
  layer?: 'e2e' | 'api' | 'ui' | 'component' | 'unit';
  /** Stable id used by TestOps / TMS integrations. */
  allureId?: string;
  /** Visible parameters (also part of the history id unless excluded). */
  parameters?: Record<string, string | number | boolean>;
}

/**
 * Thin, typed facade over `allure-js-commons`.
 * Keeps tests readable and makes every Allure feature discoverable in one file.
 */
export const AllureHelper = {
  /** Apply the full set of labels, links and descriptions for a test. */
  async applyMetadata(meta: TestMetadata): Promise<void> {
    if (meta.epic) await allure.epic(meta.epic);
    if (meta.feature) await allure.feature(meta.feature);
    if (meta.story) await allure.story(meta.story);
    if (meta.severity) await allure.severity(meta.severity);
    if (meta.owner) await allure.owner(meta.owner);
    if (meta.layer) await allure.layer(meta.layer);
    if (meta.allureId) await allure.allureId(meta.allureId);
    if (meta.tags?.length) await allure.tags(...meta.tags.map((t) => t.replace(/^@/, '')));
    if (meta.description) await allure.description(meta.description);
    if (meta.descriptionHtml) await allure.descriptionHtml(meta.descriptionHtml);
    for (const id of meta.issues ?? []) await allure.issue(id, id);
    for (const id of meta.tms ?? []) await allure.tms(id, id);
    for (const l of meta.links ?? []) await allure.link(l.url, l.name, l.type);
    for (const [name, value] of Object.entries(meta.parameters ?? {})) {
      await allure.parameter(name, String(value));
    }
  },

  /** Add parameters that document the run but must not split history (browser, viewport…). */
  async contextParameters(values: Record<string, string | number | boolean>): Promise<void> {
    for (const [name, value] of Object.entries(values)) {
      await allure.parameter(name, String(value), { excluded: true });
    }
  },

  /** Record a value that should appear in the report, masked (e.g. passwords). */
  async secretParameter(name: string, value: string): Promise<void> {
    await allure.parameter(name, value, { mode: 'masked', excluded: true });
  },

  /** A named step. Nested calls produce a nested step tree with individual timings. */
  step<T>(name: string, body: (ctx: allure.StepContext) => T | PromiseLike<T>): PromiseLike<T> {
    return allure.step(name, body);
  },

  /**
   * An assertion wrapped in a step whose title explains *what* is validated.
   * On failure the step turns red and the error keeps the business-level message.
   */
  async verify(description: string, assertion: () => unknown | Promise<unknown>): Promise<void> {
    await allure.step(`✔ Verify: ${description}`, async () => {
      await assertion();
    });
  },

  /** An instantaneous step without a body, e.g. to record a decision or an observation. */
  async logStep(name: string, status: Status = Status.PASSED, error?: Error): Promise<void> {
    await allure.logStep(name, status, error);
  },

  /** Full-page screenshot at a meaningful point of the scenario ("checkpoint"). */
  async checkpoint(page: Page, name: string, options: { force?: boolean; fullPage?: boolean } = {}): Promise<void> {
    if (!config.checkpointScreenshots && !options.force) return;
    await allure.step(`📸 Checkpoint: ${name}`, async () => {
      const png = await page.screenshot({ fullPage: options.fullPage ?? false, animations: 'disabled' });
      await allure.attachment(`Checkpoint – ${name}`, png, ContentType.PNG);
    });
  },

  /** Screenshot of a single element (e.g. the cart summary). */
  async attachElementScreenshot(locator: Locator, name: string): Promise<void> {
    const png = await locator.screenshot({ animations: 'disabled' });
    await allure.attachment(name, png, ContentType.PNG);
  },

  /** Serialised DOM of the current page — open it in the report to inspect markup at that moment. */
  async attachHtmlSnapshot(page: Page, name = 'HTML snapshot'): Promise<void> {
    const html = await page.content();
    await allure.attachment(`${name} (${page.url()})`, html, ContentType.HTML);
  },

  async attachJson(name: string, data: unknown): Promise<void> {
    await allure.attachment(name, JSON.stringify(data, null, 2), ContentType.JSON);
  },

  async attachText(name: string, text: string): Promise<void> {
    await allure.attachment(name, text, ContentType.TEXT);
  },

  async attachCsv(name: string, rows: Array<Record<string, unknown>> | string): Promise<void> {
    const csv = typeof rows === 'string' ? rows : toCsv(rows);
    await allure.attachment(name, csv, ContentType.CSV);
  },

  async attachHtml(name: string, html: string): Promise<void> {
    await allure.attachment(name, html, ContentType.HTML);
  },

  /** Attach an existing file (log file, downloaded report, fixture…). */
  async attachFile(name: string, path: string, contentType: ContentType | string): Promise<void> {
    await allure.attachmentPath(name, path, { contentType });
  },
};

/** Minimal RFC-4180 CSV serialiser for attachments. */
export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const escape = (v: unknown): string => {
    const s = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

/** Render rows as a small, styled HTML table (Allure displays text/html attachments inline). */
export function toHtmlTable(title: string, rows: Array<Record<string, unknown>>, highlight?: (row: Record<string, unknown>) => string | undefined): string {
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v: unknown): string =>
    String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  const body = rows
    .map((r) => {
      const bg = highlight?.(r);
      return `<tr${bg ? ` style="background:${bg}"` : ''}>${headers.map((h) => `<td>${esc(r[h])}</td>`).join('')}</tr>`;
    })
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font:13px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;margin:12px;color:#1f2937}
h3{margin:0 0 8px}table{border-collapse:collapse;width:100%}
th,td{border:1px solid #e5e7eb;padding:4px 8px;text-align:left;vertical-align:top;word-break:break-all}
th{background:#f3f4f6;position:sticky;top:0}
</style></head><body><h3>${esc(title)}</h3><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

/**
 * Method decorator that turns a page-object method into an Allure step.
 *
 *   @step('Add "{0}" to the cart')
 *   async addToCart(name: string) { ... }
 *
 * Placeholders:
 *   `{0}`, `{1}`…   call arguments
 *   `{this.path}`   a property of the instance (e.g. the page path)
 *   `{class}`       the class name, e.g. "CartPage"
 * Without a title the step is named `ClassName.methodName`.
 */
export function step(title?: string) {
  return function <This, Args extends unknown[], Return>(
    target: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>,
  ) {
    return async function (this: This, ...args: Args): Promise<Return> {
      const className = (this as { constructor: { name: string } }).constructor.name;
      const name = title
        ? title
            .replace(/\{(\d+)\}/g, (_, i: string) => formatArg(args[Number(i)]))
            .replace(/\{this\.(\w+)\}/g, (_, prop: string) => formatArg((this as Record<string, unknown>)[prop]))
            .replace(/\{class\}/g, className)
        : `${className}.${String(context.name)}`;
      return allure.step(name, () => target.call(this, ...args));
    };
  };
}

function formatArg(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
