/**
 * Environment definitions.
 *
 * Every environment describes *where* the tests run and *how patient* they are.
 * Select one with `TEST_ENV=<name>` (defaults to `production`). Individual
 * values can still be overridden with env vars (see `.env.example`).
 */
export interface EnvironmentConfig {
  /** Human readable name, shown in the Allure "Environment" widget. */
  name: string;
  /** Storefront root URL. */
  baseURL: string;
  /** Default timeout for Playwright actions (click, fill, ...). */
  actionTimeout: number;
  /** Default timeout for page navigations. */
  navigationTimeout: number;
  /** Timeout for `expect(...)` auto-retrying assertions. */
  expectTimeout: number;
  /** Per-test timeout. */
  testTimeout: number;
  /** Requests slower than this (ms) are flagged in the network report. */
  slowRequestThresholdMs: number;
  /** Currency symbol the storefront renders prices with. */
  currencySymbol: string;
}

export const environments = {
  production: {
    name: 'production',
    baseURL: 'https://sauce-demo.myshopify.com',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    expectTimeout: 10_000,
    testTimeout: 90_000,
    slowRequestThresholdMs: 1_500,
    currencySymbol: '£',
  },
  // The demo store has no real staging instance; this entry shows how a second
  // environment is declared. Point it elsewhere with BASE_URL.
  staging: {
    name: 'staging',
    baseURL: 'https://sauce-demo.myshopify.com',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    expectTimeout: 15_000,
    testTimeout: 120_000,
    slowRequestThresholdMs: 3_000,
    currencySymbol: '£',
  },
} satisfies Record<string, EnvironmentConfig>;

export type EnvironmentName = keyof typeof environments;
