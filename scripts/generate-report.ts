/**
 * Generate the Allure report with history (trends), metadata and the custom theme.
 *
 *   npm run allure:generate              -> allure-report/ (multi-file, open with `npm run allure:open`)
 *   npm run allure:single-file           -> allure-report/index.html (one self-contained file to share)
 *   ... -- --no-history-save             -> re-render the SAME results (e.g. another format) without
 *                                           recording a new build in the trend history
 *
 * Steps
 *   1. write environment.properties, executor.json, categories.json into allure-results/
 *   2. restore allure-history/history -> allure-results/history (this is what powers the Trend graphs)
 *   3. allure generate
 *   4. save allure-report/history -> allure-history/history for the next run
 *   5. inject the custom theme (allure-theme/)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import allureConfig from '../allure-report.config';
import { writeCategories, writeEnvironmentProperties, writeExecutor } from '../src/config/allure-metadata';
import { copyDir, runAllure } from './lib/allure-cli';

const root = path.resolve(__dirname, '..');
const resultsDir = path.join(root, allureConfig.resultsDir);
const reportDir = path.join(root, allureConfig.reportDir);
const historyDir = path.join(root, allureConfig.historyDir);
const singleFile = process.argv.includes('--single-file');
const saveHistory = !process.argv.includes('--no-history-save');

function nextBuildNumber(): number {
  const counterFile = path.join(historyDir, 'build-number.txt');
  const current = fs.existsSync(counterFile) ? Number.parseInt(fs.readFileSync(counterFile, 'utf-8'), 10) || 0 : 0;
  if (!saveHistory) return Math.max(current, 1);
  const next = process.env.GITHUB_RUN_NUMBER ? Number(process.env.GITHUB_RUN_NUMBER) : current + 1;
  fs.mkdirSync(historyDir, { recursive: true });
  fs.writeFileSync(counterFile, String(next));
  return next;
}

export function injectTheme(): void {
  const { theme } = allureConfig;
  const indexHtml = path.join(reportDir, 'index.html');
  if (!theme.enabled || !fs.existsSync(indexHtml)) return;

  const cssFile = path.join(root, theme.stylesheet);
  const logoFile = path.join(root, theme.logo);
  if (!fs.existsSync(cssFile)) return;

  let css = fs.readFileSync(cssFile, 'utf-8');
  if (fs.existsSync(logoFile)) {
    const logo = `data:image/svg+xml;base64,${fs.readFileSync(logoFile).toString('base64')}`;
    css = css.replace(/url\(['"]?logo\.svg['"]?\)/g, `url("${logo}")`);
  }
  const html = fs.readFileSync(indexHtml, 'utf-8');
  const marker = '<!-- custom-theme -->';
  const cleaned = html.replace(new RegExp(`${marker}[\\s\\S]*?${marker}`), '');
  // Inline <style> works for both the multi-file and the single-file report.
  const injected = cleaned.replace('</head>', `${marker}<style>\n${css}\n</style>${marker}\n</head>`);
  fs.writeFileSync(indexHtml, injected);
}

function printSummary(): void {
  const summaryFile = path.join(reportDir, 'widgets', 'summary.json');
  if (!fs.existsSync(summaryFile)) return;
  const { statistic, time } = JSON.parse(fs.readFileSync(summaryFile, 'utf-8')) as {
    statistic: Record<string, number>;
    time: { duration: number };
  };
  console.log(
    `\n📊 ${statistic.total} tests | ✅ ${statistic.passed} passed | ❌ ${statistic.failed} failed | ` +
      `💥 ${statistic.broken} broken | ⏭️ ${statistic.skipped} skipped | ⏱️ ${(time.duration / 1000).toFixed(1)}s`,
  );
}

async function main(): Promise<void> {
  if (!fs.existsSync(resultsDir) || fs.readdirSync(resultsDir).filter((f) => f.endsWith('-result.json')).length === 0) {
    console.error(`No test results in ${allureConfig.resultsDir}/. Run the tests first (npm test).`);
    process.exit(1);
  }

  const build = nextBuildNumber();
  writeEnvironmentProperties();
  writeExecutor(build);
  writeCategories();

  // Allure adds the current results as a new trend point on top of the restored history.
  // Keep the input history of this build so the same results can be re-rendered later
  // (--no-history-save) without counting them twice.
  const previous = path.join(historyDir, 'previous-history');
  if (saveHistory) {
    fs.rmSync(previous, { recursive: true, force: true });
    copyDir(path.join(historyDir, 'history'), previous);
  }
  fs.rmSync(path.join(resultsDir, 'history'), { recursive: true, force: true });
  const restored = copyDir(saveHistory ? path.join(historyDir, 'history') : previous, path.join(resultsDir, 'history'));
  console.log(restored ? `↺ Restored ${restored} history files (trends enabled).` : 'ℹ️  No history yet — trends appear from the 2nd report on.');

  const args = [
    'generate',
    resultsDir,
    '-o',
    reportDir,
    '--clean',
    '--name',
    allureConfig.reportName,
    '--lang',
    allureConfig.reportLanguage,
    ...(singleFile ? ['--single-file'] : []),
  ];
  const code = await runAllure(args);
  if (code !== 0) {
    console.error(`allure generate exited with code ${code}`);
    process.exit(code);
  }

  const saved = saveHistory ? copyDir(path.join(reportDir, 'history'), path.join(historyDir, 'history')) : 0;
  if (saved) console.log(`💾 Saved history for build #${build} to ${allureConfig.historyDir}/`);

  injectTheme();
  printSummary();
  console.log(`\n✅ Report: ${path.relative(root, reportDir)}${singleFile ? '/index.html' : ''}  →  npm run allure:open`);
}

// Only run when executed directly (inject-theme.ts imports injectTheme()).
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
