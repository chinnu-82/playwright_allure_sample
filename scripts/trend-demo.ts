/**
 * Build a report with real history by running a fast subset of the suite
 * several times and generating the report after each run.
 *
 *   npm run trend:demo            (4 runs)
 *   npm run trend:demo -- 6       (6 runs)
 *
 * Every other run disables the intentional failures, so the Trend graphs
 * show a realistic mix of green and red builds.
 */
import { playwright, tsx } from './lib/run';

const runs = Number.parseInt(process.argv[2] ?? '4', 10);
const grep = process.env.TREND_GREP ?? '@smoke|@showcase';

for (let i = 1; i <= runs; i++) {
  const showcaseFailures = i % 2 === 0 ? 'false' : 'true';
  console.log(`\n==================== Trend run ${i}/${runs} (SHOWCASE_FAILURES=${showcaseFailures}) ====================`);

  // Note: do not pass --reporter here; a CLI reporter REPLACES the configured allure-playwright reporter.
  playwright(['test', '--grep', grep], { ...process.env, SHOWCASE_FAILURES: showcaseFailures });

  const gen = tsx(['scripts/generate-report.ts']);
  if (gen.status !== 0) process.exit(gen.status ?? 1);
}

console.log('\n✅ Done. Open the report with: npm run allure:open  (see the Trend widgets on the Overview page)');
