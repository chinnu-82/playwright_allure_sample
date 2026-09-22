import { defineConfig, devices, type Project } from '@playwright/test';
import type { AllureReporter } from 'allure-playwright';
import allureConfig from './allure-report.config';
import { config } from './src/config';

const desktop = {
  viewport: config.viewport,
  headless: config.headless,
  launchOptions: { slowMo: config.slowMo },
};

const projects: Project[] = [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...desktop } }];

if (config.browsers === 'all') {
  projects.push(
    { name: 'firefox', use: { ...devices['Desktop Firefox'], ...desktop } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], ...desktop } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'], headless: config.headless } },
  );
}

const allureReporterOptions: AllureReporter['options'] = {
  resultsDir: allureConfig.resultsDir,
  // false = only test.step()/allure.step() in the report (clean);
  // true  = also every Playwright API call and expect() (verbose, great for debugging).
  detail: config.allureDetail,
  suiteTitle: true,
  links: allureConfig.links,
  categories: allureConfig.categories,
  // environment.properties and executor.json are written by src/config/allure-metadata.ts
  // (global teardown) so they can include runtime data such as browser versions.

  // Labels added to every test result.
  globalLabels: { application: 'sauce-demo-storefront' },
};

export default defineConfig({
  testDir: './src/tests',
  outputDir: './test-results',
  timeout: config.testTimeout,
  expect: { timeout: config.expectTimeout },
  fullyParallel: true,
  forbidOnly: config.isCI,
  retries: config.retries,
  workers: config.workers,

  reporter: [
    ['list'],
    ['allure-playwright', allureReporterOptions],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: config.baseURL,
    actionTimeout: config.actionTimeout,
    navigationTimeout: config.navigationTimeout,
    screenshot: config.screenshot === 'off' ? 'off' : { mode: config.screenshot, fullPage: true },
    video: config.video === 'off' ? 'off' : { mode: config.video, size: config.viewport },
    trace: config.trace,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    extraHTTPHeaders: { 'Accept-Language': 'en-GB,en;q=0.9' },
  },

  projects,

  globalSetup: './src/config/global-setup.ts',
  globalTeardown: './src/config/global-teardown.ts',
});
