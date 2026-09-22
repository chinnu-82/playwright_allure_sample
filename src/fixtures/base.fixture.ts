import { test as base, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import allureConfig from '../../allure-report.config';
import { config } from '../config';
import { CartPage } from '../pages/CartPage';
import { CatalogPage } from '../pages/CatalogPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProductPage } from '../pages/ProductPage';
import { RegisterPage } from '../pages/RegisterPage';
import { SearchPage } from '../pages/SearchPage';
import { AllureHelper } from '../utils/allure-helper';
import { ApiInterceptor } from '../utils/api-interceptor';
import { ConsoleMonitor } from '../utils/console-monitor';
import { Logger } from '../utils/logger';
import { ShopApiClient } from '../utils/shop-api-client';

export interface PageObjects {
  homePage: HomePage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  catalogPage: CatalogPage;
  productPage: ProductPage;
  searchPage: SearchPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
}

export interface TestFixtures extends PageObjects {
  logger: Logger;
  /** Storefront AJAX API client sharing cookies with the browser (fast test setup). */
  shopApi: ShopApiClient;
  network: ApiInterceptor;
  consoleMonitor: ConsoleMonitor;
  /** Auto fixture: environment parameters before, evidence attachments after each test. */
  evidence: void;
}

export interface WorkerFixtures {
  /** Auto worker fixture: records browser name/version for the Environment widget. */
  browserMetadata: void;
}

/** Folder (inside allure-results) where workers drop runtime metadata for prepare-allure.ts. */
export const META_DIR = path.join(allureConfig.resultsDir, '.meta');

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // ------------------------------------------------------------ infrastructure
  logger: async ({}, use, testInfo) => {
    await use(new Logger(testInfo.titlePath.slice(1).join(' › ')));
  },

  network: async ({ page, logger }, use) => {
    const interceptor = new ApiInterceptor(
      page,
      { baseURL: config.baseURL, slowThresholdMs: config.slowRequestThresholdMs },
      logger.child('network'),
    );
    interceptor.start();
    await use(interceptor);
    await interceptor.stop();
  },

  shopApi: async ({ page, logger }, use) => {
    await use(new ShopApiClient(page.request, logger.child('api')));
  },

  consoleMonitor: async ({ page, logger }, use) => {
    const monitor = new ConsoleMonitor(page, logger.child('console'));
    monitor.start();
    await use(monitor);
    monitor.stop();
  },

  evidence: [
    async ({ page, logger, network, consoleMonitor }, use, testInfo) => {
      const viewport = page.viewportSize();
      // allure-playwright already adds the Playwright project (browser) as a parameter.
      await AllureHelper.contextParameters({
        Viewport: viewport ? `${viewport.width}x${viewport.height}` : 'n/a',
        Environment: config.name,
      });
      const startedAt = Date.now();
      logger.info(`▶ START "${testInfo.title}" (attempt ${testInfo.retry + 1}, worker ${testInfo.workerIndex})`);

      await use();

      const failed = testInfo.status !== testInfo.expectedStatus;
      logger.info(`■ END status=${testInfo.status} duration=${Date.now() - startedAt}ms`);

      // HTML snapshot captures the DOM exactly as it was when the test ended.
      if (failed && !page.isClosed()) {
        await AllureHelper.attachHtmlSnapshot(page, 'HTML snapshot at failure').catch(() => undefined);
      }
      await network.stop();
      await network.attachToAllure({ full: failed });
      await consoleMonitor.attachToAllure();
      await AllureHelper.attachText('📝 execution.log', logger.toText());
    },
    { auto: true },
  ],

  browserMetadata: [
    async ({ browser, browserName }, use, workerInfo) => {
      try {
        fs.mkdirSync(META_DIR, { recursive: true });
        const file = path.join(META_DIR, `browser-${workerInfo.project.name}.json`);
        fs.writeFileSync(
          file,
          JSON.stringify({
            project: workerInfo.project.name,
            browserName,
            browserVersion: browser.version(),
            viewport: workerInfo.project.use.viewport ?? config.viewport,
            headless: workerInfo.project.use.headless ?? config.headless,
            os: `${os.type()} ${os.release()} (${os.arch()})`,
          }),
        );
      } catch {
        // Metadata is best-effort; never fail a run because of it.
      }
      await use();
    },
    { auto: true, scope: 'worker' },
  ],

  // ------------------------------------------------------------ page objects
  homePage: async ({ page, logger }, use) => use(new HomePage(page, logger)),
  loginPage: async ({ page, logger }, use) => use(new LoginPage(page, logger)),
  registerPage: async ({ page, logger }, use) => use(new RegisterPage(page, logger)),
  catalogPage: async ({ page, logger }, use) => use(new CatalogPage(page, logger)),
  productPage: async ({ page, logger }, use) => use(new ProductPage(page, logger)),
  searchPage: async ({ page, logger }, use) => use(new SearchPage(page, logger)),
  cartPage: async ({ page, logger }, use) => use(new CartPage(page, logger)),
  checkoutPage: async ({ page, logger }, use) => use(new CheckoutPage(page, logger)),
});

export { expect };
