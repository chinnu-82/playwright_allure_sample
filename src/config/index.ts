import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { environments, type EnvironmentConfig, type EnvironmentName } from './environments';

// Load `.env` (optional) before anything reads process.env.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const bool = (value: string | undefined, fallback: boolean): boolean =>
  value === undefined || value === '' ? fallback : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());

const int = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const envName = (process.env.TEST_ENV ?? 'production') as EnvironmentName;
if (!(envName in environments)) {
  throw new Error(
    `Unknown TEST_ENV "${envName}". Valid values: ${Object.keys(environments).join(', ')}`,
  );
}

const base: EnvironmentConfig = environments[envName];
const isCI = bool(process.env.CI, false);

/**
 * Single source of truth for runtime configuration.
 * Import this instead of reading `process.env` throughout the code base.
 */
export const config = {
  ...base,
  baseURL: process.env.BASE_URL ?? base.baseURL,
  isCI,
  headless: bool(process.env.HEADLESS, true),
  slowMo: int(process.env.SLOWMO, 0),
  workers: process.env.WORKERS ? int(process.env.WORKERS, 2) : isCI ? 2 : 3,
  retries: int(process.env.RETRIES, isCI ? 2 : 1),
  /** `all` runs chromium, firefox, webkit and a mobile profile. */
  browsers: (process.env.BROWSERS ?? 'chromium').toLowerCase(),
  video: (process.env.VIDEO ?? 'retain-on-failure') as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry',
  trace: (process.env.TRACE ?? 'retain-on-failure') as 'on' | 'off' | 'retain-on-failure' | 'on-first-retry',
  screenshot: (process.env.SCREENSHOT ?? 'only-on-failure') as 'on' | 'off' | 'only-on-failure',
  viewport: {
    width: int(process.env.VIEWPORT_WIDTH, 1366),
    height: int(process.env.VIEWPORT_HEIGHT, 900),
  },
  logLevel: (process.env.LOG_LEVEL ?? 'warn') as 'debug' | 'info' | 'warn' | 'error',
  /** Include Playwright's internal API/expect steps in Allure (verbose). */
  allureDetail: bool(process.env.ALLURE_DETAIL, false),
  /** Run the intentionally failing/broken showcase tests. */
  showcaseFailures: bool(process.env.SHOWCASE_FAILURES, true),
  /** Take a screenshot at every `checkpoint()` call, not just on failure. */
  checkpointScreenshots: bool(process.env.CHECKPOINT_SCREENSHOTS, true),
} as const;

export type RuntimeConfig = typeof config;
