/**
 * Run the tests, then ALWAYS generate the Allure report — even when tests fail
 * (cross-platform replacement for `npm test; npm run allure:generate`).
 * Extra arguments are forwarded to Playwright:  npm run test:report -- --grep @smoke
 */
import { playwright, tsx } from './lib/run';

const tests = playwright(['test', ...process.argv.slice(2)]);
const report = tsx(['scripts/generate-report.ts']);

// Exit with the test status so CI still goes red on failures.
process.exit(tests.status ?? report.status ?? 1);
