/**
 * Pass-through wrapper around the Allure CLI that repairs a broken JAVA_HOME first.
 *
 *   npx tsx scripts/allure.ts open allure-report
 *   npx tsx scripts/allure.ts serve allure-results
 */
import { runAllure } from './lib/allure-cli';

runAllure(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
