/**
 * Capture screenshots of the generated Allure report for the tutorial (docs/images).
 *
 *   npm run docs:screenshots     (requires a generated allure-report/)
 */
import { chromium, type Locator, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { serveDir } from './serve';

const root = path.resolve(__dirname, '../..');
const reportDir = path.join(root, 'allure-report');
const outDir = path.join(root, 'docs', 'images');
const PORT = 5055;
const MAX_ELEMENT_HEIGHT = 900; // CSS px
const BASE = `http://localhost:${PORT}/index.html`;

interface TestCase {
  uid: string;
  name: string;
  status: string;
  extra?: { retries?: unknown[] };
}

function loadTestCases(): TestCase[] {
  const dir = path.join(reportDir, 'data', 'test-cases');
  return fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as TestCase);
}

/** The "main" result of a test: the one that carries the retries list. */
function uidOf(cases: TestCase[], namePart: string): string {
  const matches = cases.filter((c) => c.name.includes(namePart));
  if (!matches.length) throw new Error(`No test case matching "${namePart}"`);
  return (matches.find((c) => (c.extra?.retries?.length ?? 0) > 0) ?? matches[0]).uid;
}

async function go(page: Page, hash: string): Promise<void> {
  // Reload for every view so expanded steps/attachments from the previous shot are reset.
  await page.goto('about:blank');
  await page.goto(`${BASE}#${hash}`);
  await page.locator('.side-nav__menu').waitFor();
  await page.waitForTimeout(1800);
}

async function shot(target: Page | Locator, name: string, fullPage = false): Promise<void> {
  const file = path.join(outDir, `${name}.png`);
  if ('goto' in target) {
    await target.screenshot({ path: file, fullPage });
  } else {
    // Cap very tall elements (long JSON responses, big tables) at one viewport so they fit a PDF page.
    await target.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    const box = await target.boundingBox();
    const viewport = target.page().viewportSize();
    if (box && viewport && box.height > MAX_ELEMENT_HEIGHT) {
      const y = Math.max(0, box.y);
      await target.page().screenshot({
        path: file,
        clip: { x: box.x, y, width: box.width, height: Math.min(MAX_ELEMENT_HEIGHT, viewport.height - y) },
      });
    } else {
      await target.screenshot({ path: file });
    }
  }
  console.log(`  📸 ${name}.png`);
}

async function expandStep(page: Page, name: string | RegExp): Promise<void> {
  const title = page.locator('.step__title_hasContent', { has: page.locator('.step__name', { hasText: name }) }).first();
  await title.scrollIntoViewIfNeeded();
  await title.click();
  await page.waitForTimeout(300);
}

async function expandAttachment(page: Page, name: string | RegExp): Promise<Locator> {
  const row = page.locator('.attachment-row', { has: page.locator('.attachment-row__name', { hasText: name }) }).first();
  // Evidence attached by fixtures lives in the collapsed "After Hooks" step.
  if (!(await row.isVisible())) await expandStep(page, 'After Hooks');
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(1800);
  return row.locator('xpath=..');
}

async function main(): Promise<void> {
  if (!fs.existsSync(path.join(reportDir, 'index.html'))) throw new Error('Generate the report first: npm run allure:generate');
  fs.mkdirSync(outDir, { recursive: true });
  const cases = loadTestCases();
  const server = await serveDir(reportDir, PORT);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1.5 });

  try {
    // ---- Dashboard & navigation views
    await go(page, '');
    await shot(page, '01-overview', true);

    await go(page, 'categories');
    await page.locator('.node__title', { hasText: 'Product defects' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('.node__title', { hasText: 'Expected' }).first().click().catch(() => undefined);
    await page.waitForTimeout(400);
    await shot(page, '02-categories');

    await go(page, 'suites');
    await page.locator('.node__title', { hasText: 'chromium' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('.node__title', { hasText: 'cart' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('.node__title', { hasText: 'Shopping cart' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('.node__title', { hasText: 'Cart total equals' }).first().click();
    await page.waitForTimeout(1800);
    await shot(page, '03-suites');

    await go(page, 'behaviors');
    await page.locator('.node__title', { hasText: 'Web Shop' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('.node__title', { hasText: 'Checkout' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('.node__title', { hasText: 'Checkout validation' }).first().click();
    await page.waitForTimeout(400);
    await shot(page, '04-behaviors');

    await go(page, 'graph');
    await shot(page, '05-graphs', true);

    await go(page, 'timeline');
    await shot(page, '06-timeline');

    await go(page, 'packages');
    await shot(page, '07-packages');

    // ---- Test result details
    await go(page, `testresult/${uidOf(cases, 'Rich metadata')}`);
    await shot(page.locator('.test-result-overview__tags, .test-result-overview__before').first().locator('xpath=..'), '08-metadata');

    await go(page, `testresult/${uidOf(cases, 'Nested steps with parameters')}`);
    await expandStep(page, 'Level 1: browse the catalog');
    await expandStep(page, 'Level 2: inspect products');
    await expandStep(page, 'Level 3');
    await shot(page.locator('.test-result-execution'), '09-nested-steps');

    await go(page, `testresult/${uidOf(cases, 'Cart total equals the sum')}`);
    await shot(page.locator('.test-result-execution'), '10-steps-verify');

    await go(page, `testresult/${uidOf(cases, 'FAILED: cart total assertion')}`);
    await shot(page.locator('.test-result'), '11-failed-test');
    await page.getByRole('link', { name: 'Retries' }).click();
    await page.waitForTimeout(600);
    await shot(page.locator('.test-result'), '12-retries');
    await page.getByRole('link', { name: 'History' }).click();
    await page.waitForTimeout(600);
    await shot(page.locator('.test-result'), '13-history');

    await go(page, `testresult/${uidOf(cases, 'FAILED: cart total assertion')}`);
    const screenshotRow = await expandAttachment(page, /^screenshot/);
    await shot(screenshotRow, '14-failure-screenshot');

    await go(page, `testresult/${uidOf(cases, 'Add to cart fails gracefully')}`);
    await shot(await expandAttachment(page, 'Network log'), '15-network-log');
    await go(page, `testresult/${uidOf(cases, 'Add to cart fails gracefully')}`);
    await shot(await expandAttachment(page, 'Failed network requests'), '16-failed-requests');

    await go(page, `testresult/${uidOf(cases, 'Browser console capture')}`);
    await shot(await expandAttachment(page, 'Console errors'), '17-console-errors');
    await go(page, `testresult/${uidOf(cases, 'Browser console capture')}`);
    await shot(await expandAttachment(page, 'execution.log'), '18-execution-log');

    await go(page, `testresult/${uidOf(cases, 'Custom attachments')}`);
    await shot(page.locator('.test-result-execution'), '19-attachments');
    await shot(await expandAttachment(page, 'price-matrix.csv'), '20-csv-attachment');

    await go(page, `testresult/${uidOf(cases, 'Full shopping journey')}`);
    await shot(page.locator('.test-result-execution'), '21-checkpoints');
    await shot(await expandAttachment(page, /^video/), '22-video');

    await go(page, `testresult/${uidOf(cases, 'Parameters demo')}`);
    await shot(page.locator('.test-result-overview__before'), '23-parameters');

    await go(page, `testresult/${uidOf(cases, 'FLAKY')}`);
    await shot(page.locator('.test-result'), '24-flaky');

    await go(page, `testresult/${uidOf(cases, 'BROKEN')}`);
    await shot(page.locator('.test-result-overview'), '25-broken');

    await go(page, `testresult/${uidOf(cases, 'GET /products.json returns')}`);
    await expandStep(page, 'API GET /products.json');
    await expandAttachment(page, 'Response 200');
    await shot(page.locator('.step', { has: page.locator(':scope > .step__title .step__name', { hasText: 'API GET /products.json' }) }).first(), '26-api-step');

    await go(page, `testresult/${uidOf(cases, 'Network and performance')}`);
    await expandStep(page, 'Measure /collections/all');
    await shot(page.locator('.test-result-execution'), '27-performance');

    // Dark mode (built into recent Allure 2 releases)
    await go(page, '');
    await page.locator('.side-nav__theme').click();
    await page.waitForTimeout(600);
    await shot(page, '28-dark-theme');
    await page.locator('.side-nav__theme').click();
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
