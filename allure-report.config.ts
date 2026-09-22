/**
 * Allure report configuration — one place for everything Allure-related.
 *
 * Consumed by:
 *   - playwright.config.ts      -> reporter options (results dir, link templates, categories)
 *   - src/config/allure-metadata.ts -> environment.properties, executor.json, categories.json
 *   - scripts/generate-report.ts-> history handling, report name, custom theme
 */
import { Status } from 'allure-js-commons';
import type { Category } from 'allure-js-commons/sdk';

export interface AllureReportConfig {
  resultsDir: string;
  reportDir: string;
  /** Where the `history/` folder is persisted between runs (enables Trend graphs). */
  historyDir: string;
  reportName: string;
  reportLanguage: 'en' | 'ru' | 'zh' | 'de' | 'nl' | 'he' | 'br' | 'ja' | 'es' | 'kr' | 'fr' | 'az';
  /** Link templates: `allure.issue('SHOP-12')` becomes a clickable URL. */
  links: Record<string, { urlTemplate: string; nameTemplate: string }>;
  /** Custom defect categories shown in the "Categories" tab. */
  categories: Category[];
  /** Static key/values merged into the "Environment" widget. */
  environment: Record<string, string>;
  theme: {
    enabled: boolean;
    /** Path of the stylesheet injected into the generated report. */
    stylesheet: string;
    /** Path of the logo copied into the report. */
    logo: string;
  };
}

export const allureConfig: AllureReportConfig = {
  resultsDir: 'allure-results',
  reportDir: 'allure-report',
  historyDir: 'allure-history',
  reportName: 'Sauce Demo – E2E Quality Report',
  reportLanguage: 'en',

  links: {
    issue: {
      urlTemplate: 'https://github.com/your-org/playwright-allure-showcase/issues/%s',
      nameTemplate: 'Issue #%s',
    },
    tms: {
      urlTemplate: 'https://your-org.testrail.io/index.php?/cases/view/%s',
      nameTemplate: 'TC-%s',
    },
    jira: {
      urlTemplate: 'https://your-org.atlassian.net/browse/%s',
      nameTemplate: '%s',
    },
  },

  // Order matters: a result is assigned to the FIRST matching category.
  categories: [
    {
      name: 'Known issues (captcha / bot protection)',
      messageRegex: '.*(captcha|hCaptcha|bot protection).*',
      matchedStatuses: [Status.FAILED, Status.BROKEN],
    },
    {
      name: 'Timeouts (infrastructure or slow environment)',
      messageRegex: '.*(Timeout|timed out|exceeded).*',
      matchedStatuses: [Status.BROKEN, Status.FAILED],
    },
    {
      name: 'Network / API failures',
      messageRegex: '.*(net::ERR|ECONNREFUSED|status code|HTTP [45]\\d\\d|API).*',
      matchedStatuses: [Status.FAILED, Status.BROKEN],
    },
    {
      name: 'Locator / element problems',
      messageRegex: '.*(locator|element\\(s\\) not found|strict mode violation|not visible).*',
      matchedStatuses: [Status.FAILED, Status.BROKEN],
    },
    {
      name: 'Product defects (assertion failures)',
      messageRegex: '.*(expect|Expected|toBe|toHave|toEqual|toContain).*',
      matchedStatuses: [Status.FAILED],
    },
    {
      name: 'Test defects (broken tests)',
      matchedStatuses: [Status.BROKEN],
    },
    {
      name: 'Flaky tests',
      matchedStatuses: [Status.PASSED, Status.FAILED, Status.BROKEN],
      flaky: true,
    },
    {
      name: 'Ignored / skipped tests',
      matchedStatuses: [Status.SKIPPED],
    },
  ],

  environment: {
    'Application': 'Sauce Demo (Shopify storefront)',
    'Test Framework': 'Playwright Test + TypeScript',
    'Reporter': 'allure-playwright',
  },

  theme: {
    enabled: true,
    stylesheet: 'allure-theme/custom-theme.css',
    logo: 'allure-theme/logo.svg',
  },
};

export default allureConfig;
