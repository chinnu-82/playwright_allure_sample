import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import allureConfig from '../../allure-report.config';
import { config } from './index';

interface BrowserMeta {
  project: string;
  browserName: string;
  browserVersion: string;
  viewport?: { width: number; height: number } | null;
  headless?: boolean;
  os?: string;
}

const resultsDir = path.resolve(allureConfig.resultsDir);
const metaDir = path.join(resultsDir, '.meta');

function readBrowserMeta(): BrowserMeta[] {
  if (!fs.existsSync(metaDir)) return [];
  return fs
    .readdirSync(metaDir)
    .filter((f) => f.startsWith('browser-') && f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(metaDir, f), 'utf-8')) as BrowserMeta);
}

/** Escape a value for Java .properties files (Allure 2 reads environment.properties). */
function prop(key: string, value: string): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/([=:])/g, '\\$1').replace(/\n/g, '\\n');
  return `${key.replace(/ /g, '\\ ')}=${esc(value)}`;
}

/** Environment widget content: static config + what the workers actually ran. */
export function writeEnvironmentProperties(): Record<string, string> {
  const browsers = readBrowserMeta();
  const env: Record<string, string> = {
    ...allureConfig.environment,
    'Environment': config.name,
    'Base URL': config.baseURL,
    'OS': `${os.type()} ${os.release()} (${os.arch()})`,
    'Node.js': process.version,
    'Headless': String(config.headless),
    'Viewport': `${config.viewport.width}x${config.viewport.height}`,
    'Workers': String(config.workers),
    'Retries': String(config.retries),
    'CI': String(config.isCI),
  };
  for (const b of browsers) {
    env[`Browser (${b.project})`] = `${b.browserName} ${b.browserVersion}`;
  }
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(
    path.join(resultsDir, 'environment.properties'),
    Object.entries(env)
      .map(([k, v]) => prop(k, v))
      .join('\n'),
  );
  return env;
}

/**
 * executor.json powers the "Executors" widget and gives each report a build
 * number/link, which is also what the Trend graphs use as x-axis labels.
 */
export function writeExecutor(buildOrder?: number): void {
  const gh = process.env.GITHUB_ACTIONS === 'true';
  const jenkins = !!process.env.JENKINS_URL;
  const order = buildOrder ?? Number(process.env.GITHUB_RUN_NUMBER ?? process.env.BUILD_NUMBER ?? Date.now());

  const executor = gh
    ? {
        name: 'GitHub Actions',
        type: 'github',
        url: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`,
        buildOrder: order,
        buildName: `${process.env.GITHUB_WORKFLOW} #${process.env.GITHUB_RUN_NUMBER}`,
        buildUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
        reportUrl: process.env.ALLURE_REPORT_URL ?? '',
        reportName: allureConfig.reportName,
      }
    : jenkins
      ? {
          name: 'Jenkins',
          type: 'jenkins',
          url: process.env.JENKINS_URL,
          buildOrder: order,
          buildName: process.env.BUILD_DISPLAY_NAME ?? `#${process.env.BUILD_NUMBER}`,
          buildUrl: process.env.BUILD_URL,
          reportUrl: `${process.env.BUILD_URL ?? ''}allure`,
          reportName: allureConfig.reportName,
        }
      : {
          name: `Local run (${os.userInfo().username}@${os.hostname()})`,
          type: 'local',
          buildOrder: order,
          buildName: `Local build #${order}`,
          reportName: allureConfig.reportName,
        };

  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(path.join(resultsDir, 'executor.json'), JSON.stringify(executor, null, 2));
}

/** categories.json — also written by allure-playwright, re-written here for `allure serve` on merged results. */
export function writeCategories(): void {
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(path.join(resultsDir, 'categories.json'), JSON.stringify(allureConfig.categories, null, 2));
}
