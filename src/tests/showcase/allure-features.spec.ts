/**
 * ALLURE FEATURE SHOWCASE
 * -----------------------
 * Each test in this file exists to demonstrate one Allure capability.
 * Some of them fail ON PURPOSE so the report contains every status:
 *
 *   passed · failed · broken · skipped · flaky (passed on retry) · expected-to-fail
 *
 * Run with SHOWCASE_FAILURES=false to skip the intentionally red tests (e.g. in CI).
 */
import * as fs from 'node:fs';
import { expect, test } from '../../fixtures/base.fixture';
import { config } from '../../config';
import { allure, AllureHelper, ContentType, Severity, Status } from '../../utils/allure-helper';

const EPIC = 'Allure Showcase';

test.describe('Allure feature showcase', { tag: ['@showcase'] }, () => {
  test.beforeEach(async () => {
    await allure.epic(EPIC);
    await allure.owner('qa-enablement-team');
  });

  // ------------------------------------------------------------------ metadata
  test.describe('Metadata', () => {
    test(
      'Rich metadata: labels, links, severity and descriptions',
      {
        tag: ['@smoke'],
        // Metadata can also be declared statically via Playwright annotations:
        annotation: [
          { type: 'allure.label.feature', description: 'Report metadata' },
          { type: 'allure.label.story', description: 'Labels and links' },
          { type: 'issue', description: 'https://github.com/your-org/playwright-allure-showcase/issues/7' },
          { type: 'allure.label.component', description: 'reporting' },
        ],
      },
      async ({ homePage }) => {
        await allure.severity(Severity.CRITICAL);
        await allure.layer('e2e');
        await allure.allureId('SHOWCASE-001');
        await allure.label('component', 'storefront');
        await allure.label('team', 'enablement');
        await allure.tags('metadata', 'documentation');
        // Suite hierarchy can be overridden (Suites tab).
        await allure.parentSuite('Allure Showcase');
        await allure.suite('Metadata');
        await allure.subSuite('Labels & links');
        // Links: raw URLs, templated ids (see allure-report.config.ts) and custom types.
        await allure.issue('101');
        await allure.tms('5001');
        await allure.link('SHOP-204', 'Jira: SHOP-204', 'jira');
        await allure.link('https://allurereport.org/docs/playwright/', 'Allure Playwright docs', 'docs');
        await allure.link('https://allurereport.org/docs/playwright-reference/', 'Related: API reference', 'related');
        await allure.descriptionHtml(`
          <h3>Why this test exists</h3>
          <p>It shows every kind of <b>metadata</b> Allure can hold. Open the tabs on the right:</p>
          <ul>
            <li><b>Labels</b>: epic, feature, story, severity, owner, layer, component, tags</li>
            <li><b>Links</b>: issue, TMS, Jira (custom template), docs, related</li>
            <li><b>Suites</b>: parentSuite / suite / subSuite overridden at runtime</li>
          </ul>`);

        await homePage.open();
        await AllureHelper.verify('home page title mentions Sauce Demo', async () => {
          await expect(homePage.page).toHaveTitle(/Sauce Demo/);
        });
      },
    );

    test('Parameters: plain, masked, hidden and excluded from history', async ({ page }, testInfo) => {
      await allure.feature('Report metadata');
      await allure.story('Parameters');
      await allure.severity(Severity.NORMAL);
      await allure.parameter('Customer tier', 'Gold');
      await allure.parameter('API key', 'sk_live_51H8secret', { mode: 'masked' });
      await allure.parameter('Internal trace id', 'trace-7f3a9', { mode: 'hidden' });
      await allure.parameter('Run timestamp', new Date().toISOString(), { excluded: true });
      await allure.displayName(`Parameters demo (attempt ${testInfo.retry + 1})`);

      await page.goto('/');
      await AllureHelper.verify('page loaded', async () => expect(page).toHaveURL(config.baseURL + '/'));
    });
  });

  // ------------------------------------------------------------------ steps
  test('Nested steps with parameters, timings and log steps', { tag: ['@smoke'] }, async ({ catalogPage, productPage }) => {
    await allure.feature('Detailed steps');
    await allure.story('Step hierarchy');
    await allure.severity(Severity.NORMAL);
    await allure.description('Steps nest to any depth; each shows its own **duration**. Step parameters appear next to the step name.');

    await allure.step('Level 1: browse the catalog', async (s1) => {
      await s1.parameter('page', '/collections/all');
      await catalogPage.open();

      await allure.step('Level 2: inspect products', async (s2) => {
        const products = await catalogPage.getProducts();
        await s2.parameter('products found', String(products.length));

        await allure.step('Level 3: pick the cheapest in-stock item', async (s3) => {
          const cheapest = [...products].sort((a, b) => a.price - b.price)[0];
          await s3.displayName(`Level 3: cheapest item is "${cheapest.name}" (${cheapest.priceText})`);
          await s3.parameter('price', cheapest.priceText);
        });
      });
    });

    await allure.step('Level 1: open a product (timed)', async () => {
      await productPage.openByHandle('striped-top');
      await productPage.waitForReady();
      await new Promise((r) => setTimeout(r, 300)); // visible duration in the report
    });

    // Log steps: instantaneous markers with an explicit status.
    await allure.logStep('Decision: guest checkout path chosen', Status.PASSED);
    await allure.logStep('Optional recommendation widget not present — skipped', Status.SKIPPED);
    await allure.logStep('Non-critical analytics beacon failed (does not fail the test)', Status.BROKEN, new Error('beacon blocked by browser ORB'));
  });

  // ------------------------------------------------------------------ attachments
  test('Custom attachments: JSON, CSV, XML, log file, HTML, SVG and images', async ({ page, cartPage }, testInfo) => {
    await allure.feature('Attachments');
    await allure.story('Custom attachment types');
    await allure.severity(Severity.MINOR);

    await cartPage.open();

    await AllureHelper.attachJson('order-payload.json', { orderId: 'SO-10042', items: [{ sku: 'GREY-JACKET', qty: 1, price: 55 }], currency: 'GBP' });
    await AllureHelper.attachCsv('price-matrix.csv', [
      { product: 'Grey jacket', price: 55, vat: 9.17 },
      { product: 'Striped top', price: 50, vat: 8.33 },
    ]);
    await allure.attachment('sitemap-extract.xml', '<urlset><url><loc>/products/grey-jacket</loc></url></urlset>', ContentType.XML);
    await AllureHelper.attachHtml('rendered-receipt.html', '<h2 style="font-family:sans-serif">Receipt</h2><p>Total: <b>£105.00</b></p>');
    await allure.attachment(
      'status-badge.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="28"><rect width="160" height="28" rx="4" fill="#16a34a"/><text x="80" y="18" fill="#fff" font-family="sans-serif" font-size="13" text-anchor="middle">checkout: healthy</text></svg>',
      ContentType.SVG,
    );
    await allure.attachment('related-urls.uri', `${config.baseURL}/cart\n${config.baseURL}/collections/all`, ContentType.URI);

    // A real file on disk (e.g. a log produced by the app or a tool).
    const logFile = testInfo.outputPath('application.log');
    fs.writeFileSync(logFile, ['[INFO] cart service ready', '[WARN] slow response 1800ms', '[INFO] cart rendered'].join('\n'));
    await AllureHelper.attachFile('application.log (file)', logFile, ContentType.TEXT);

    // Playwright's own testInfo.attach also lands in Allure.
    await testInfo.attach('playwright-native-attachment.txt', { body: 'Attached with testInfo.attach()', contentType: 'text/plain' });

    await AllureHelper.checkpoint(page, 'Viewport screenshot', { force: true });
    await AllureHelper.attachElementScreenshot(page.locator('#logo'), 'Element screenshot – logo');
    await AllureHelper.attachHtmlSnapshot(page);
  });

  // Visual evidence (video + trace) lives in visual-evidence.spec.ts because
  // `test.use({ video })` must be declared at file level.

  // ------------------------------------------------------------------ network & performance
  test('Network and performance metrics for key pages', { tag: ['@performance'] }, async ({ page, network }) => {
    await allure.feature('Network & performance');
    await allure.story('Page timings');
    await allure.severity(Severity.NORMAL);

    const pages = ['/', '/collections/all', '/products/grey-jacket', '/cart'];
    const metrics: Array<Record<string, string | number>> = [];

    for (const path of pages) {
      await allure.step(`Measure ${path}`, async (ctx) => {
        await page.goto(path, { waitUntil: 'load' });
        const nav = await page.evaluate(() => {
          const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            ttfb: Math.round(n.responseStart - n.requestStart),
            domContentLoaded: Math.round(n.domContentLoadedEventEnd),
            load: Math.round(n.loadEventEnd),
            transferKb: Math.round(n.transferSize / 1024),
            resources: performance.getEntriesByType('resource').length,
          };
        });
        await ctx.parameter('TTFB', `${nav.ttfb} ms`);
        await ctx.parameter('load', `${nav.load} ms`);
        metrics.push({ page: path, ...nav });
      });
    }

    await AllureHelper.attachCsv('page-metrics.csv', metrics);
    await AllureHelper.attachJson('network-summary-at-end.json', network.summary());

    for (const m of metrics) {
      expect.soft(Number(m.load), `${m.page} should finish loading within 15 s`).toBeLessThan(15_000);
    }
    await AllureHelper.verify('the cart JSON endpoint answered at least once', () => expect(network.all().length).toBeGreaterThan(0));
  });

  // ------------------------------------------------------------------ console
  test('Browser console capture and analysis', { tag: ['@console'] }, async ({ page, consoleMonitor, logger }) => {
    await allure.feature('Console & logging');
    await allure.story('Console capture');
    await allure.severity(Severity.NORMAL);

    await page.goto('/');
    // Emit messages from the page itself so the capture is deterministic.
    await page.evaluate(() => {
      console.log('[demo] storefront booted');
      console.warn('[demo] deprecated API used by a theme script');
      console.error('[demo] recommendation widget failed to load');
    });
    await page.goto('/collections/all');

    const summary = consoleMonitor.summary();
    logger.data('console.summary', summary);
    await AllureHelper.attachJson('console-summary.json', summary);

    await AllureHelper.verify('the demo error was captured', () =>
      expect(consoleMonitor.errors().map((e) => e.text)).toContain('[demo] recommendation widget failed to load'),
    );
    await AllureHelper.verify('no uncaught JavaScript exceptions on first-party pages', () =>
      expect(consoleMonitor.getPageErrors().filter((e) => e.pageUrl.startsWith(config.baseURL))).toHaveLength(0),
    );
  });

  // ------------------------------------------------------------------ statuses
  test.describe('Result statuses', () => {
    test.beforeEach(async () => {
      await allure.feature('Test statuses');
    });

    test('FAILED: cart total assertion (intentional product defect)', { tag: ['@intentional-failure'] }, async ({ shopApi, cartPage }) => {
      test.skip(!config.showcaseFailures, 'SHOWCASE_FAILURES=false');
      await allure.story('Failed');
      await allure.severity(Severity.BLOCKER);
      await allure.issue('404');
      await allure.description('Fails **on purpose**: expects a 10% discount that the store does not apply. Shows the failure message, screenshot, HTML snapshot, video and trace — and both attempts in the **Retries** tab.');

      const product = await shopApi.getProduct('grey-jacket');
      await shopApi.addToCart(product.body.variants[0].id, 1);
      await cartPage.open();
      const total = await cartPage.getTotal();

      await AllureHelper.verify('10% loyalty discount is applied to the cart total', () =>
        expect(total, 'Expected £49.50 after a 10% loyalty discount').toBe(49.5),
      );
    });

    test('BROKEN: test exceeds its timeout (infrastructure problem)', { tag: ['@intentional-failure'] }, async ({ page }) => {
      test.skip(!config.showcaseFailures, 'SHOWCASE_FAILURES=false');
      test.setTimeout(8_000);
      await allure.story('Broken');
      await allure.severity(Severity.NORMAL);
      await allure.description('allure-playwright reports a **timed-out** test as **broken** (not failed): the problem is in the test/infra, not in the product.');

      await page.goto('/');
      await allure.step('Wait for a widget that never renders', async () => {
        await page.locator('#loyalty-widget-that-does-not-exist').waitFor({ timeout: 0 });
      });
    });

    test('KNOWN ISSUE: automated sign-in is blocked by hCaptcha', { tag: ['@intentional-failure', '@known-issue'] }, async ({ loginPage }) => {
      test.skip(!config.showcaseFailures, 'SHOWCASE_FAILURES=false');
      await allure.story('Failed');
      await allure.severity(Severity.CRITICAL);
      await allure.issue('42');
      await allure.description('Its message matches the "Known issues" rule in `allure-report.config.ts`, so it is grouped in its own **category**.');

      await loginPage.open();
      await loginPage.login('demo.customer@example.com', 'CorrectHorseBatteryStaple');
      await AllureHelper.verify('customer lands on the account page', () =>
        expect(loginPage.page, 'hCaptcha bot protection prevents automated sign-in').toHaveURL(/\/account$/, { timeout: 5_000 }),
      );
    });

    test('FLAKY: fails on the first attempt, passes on retry', { tag: ['@flaky-demo'] }, async ({ page }, testInfo) => {
      test.skip(testInfo.project.retries === 0 && config.retries === 0, 'needs RETRIES >= 1');
      await allure.story('Flaky');
      await allure.severity(Severity.MINOR);
      await allure.description('Simulates a race condition. The first attempt fails, the retry passes: Allure shows it as passed with a **flaky** mark and lists every attempt under **Retries**.');
      await allure.parameter('attempt', String(testInfo.retry + 1), { excluded: true });

      await page.goto('/');
      await AllureHelper.verify(`simulated race condition resolved (attempt ${testInfo.retry + 1})`, () =>
        expect(testInfo.retry, 'first attempt loses the simulated race').toBeGreaterThan(0),
      );
    });

    test('SKIPPED: feature toggled off in this environment', async () => {
      await allure.story('Skipped');
      await allure.severity(Severity.TRIVIAL);
      test.skip(true, 'Gift cards are disabled on the demo store');
    });

    test('SKIPPED: runs on WebKit only', async ({ browserName }) => {
      await allure.story('Skipped');
      await allure.severity(Severity.TRIVIAL);
      test.skip(browserName !== 'webkit', `Apple Pay button only renders on WebKit (current: ${browserName})`);
    });

    test.fixme('FIXME: wishlist sync is not implemented yet', async () => {
      await allure.story('Skipped');
    });

    test('EXPECTED FAILURE: known defect marked with test.fail()', { tag: ['@known-issue'] }, async ({ page }) => {
      test.fail(true, 'Issue #88: the store has no /pages/shipping page yet');
      await allure.story('Expected failure');
      await allure.severity(Severity.MINOR);
      await allure.issue('88');
      const response = await page.goto('/pages/shipping');
      expect(response?.status(), 'shipping information page should exist').toBe(200);
    });
  });
});
