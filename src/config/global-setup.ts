import type { FullConfig } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import allureConfig from '../../allure-report.config';
import { config } from './index';

/**
 * Runs once before all workers start.
 * Cleans stale Allure results so each report reflects exactly one run.
 * (History is preserved separately in `allure-history/`, see scripts/generate-report.ts.)
 * Set ALLURE_KEEP_RESULTS=true to accumulate results, e.g. when merging shards.
 */
export default async function globalSetup(_: FullConfig): Promise<void> {
  const resultsDir = path.resolve(allureConfig.resultsDir);
  if (process.env.ALLURE_KEEP_RESULTS !== 'true' && fs.existsSync(resultsDir)) {
    fs.rmSync(resultsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(resultsDir, { recursive: true });

  console.log(
    `\n🧪 Environment: ${config.name} | ${config.baseURL} | headless=${config.headless} | ` +
      `browsers=${config.browsers} | retries=${config.retries} | workers=${config.workers}\n`,
  );
}
