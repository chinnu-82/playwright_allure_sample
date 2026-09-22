# Playwright + Allure Showcase

A production-ready **Playwright + TypeScript** test automation framework for the
[Sauce Demo Shopify store](https://sauce-demo.myshopify.com) that demonstrates **every major Allure Report feature**:
steps, screenshots, video, traces, network and console capture, metadata and behaviors, retries and flaky tests,
history and trends, custom categories, a custom theme, and CI/CD.

📘 **Tutorial:** [docs/Playwright-Allure-Tutorial.pdf](docs/Playwright-Allure-Tutorial.pdf) (48 pages, also as [Markdown](docs/tutorial/TUTORIAL.md))
📊 **Sample report:** [sample-reports/allure-report-single-file.html](sample-reports/allure-report-single-file.html)

![Allure overview](docs/images/01-overview.png)

## Quick start

Prerequisites: **Node.js 20+** and **Java 8+** (17 recommended; the Allure 2 CLI is a Java app).

```bash
npm ci
npx playwright install chromium
npm run test:report     # run the tests, then always generate the report
npm run allure:open     # open it
```

`npm run trend:demo` runs a fast subset four times so the report shows **trend graphs** straight away.

## What's inside

| Area | Tests | Highlights |
|---|---|---|
| `src/tests/auth` | Login page, invalid credentials (data-driven), HTML5 email validation, password recovery, `/account` protection, registration | hCaptcha-aware assertions, masked parameters |
| `src/tests/products` | Catalog, product details vs API, variants, sold-out, 404, search (data-driven), storefront API | Soft assertions, UI ↔ API cross-checks, response-time checks |
| `src/tests/cart` | Empty cart, add, totals, quantity update, remove, API sync, **simulated outage** | `page.route()` failure injection, API-based setup |
| `src/tests/checkout` | Order summary, required-field validation, invalid discount, shipping details from CSV | Stops before payment, so no order is ever placed |
| `src/tests/showcase` | One test per Allure feature, including tests that **fail on purpose** | failed · broken · skipped · flaky · expected failure |

Every test automatically receives the following evidence through fixtures: a network summary and log, API payloads,
failed requests, browser console output, a structured execution log, an HTML snapshot on failure, and
screenshots, video and traces from Playwright.

## Project structure

```text
src/
  tests/{auth,products,cart,checkout,showcase}/   spec files
  pages/                    Page Object Model with @step-decorated methods
  fixtures/base.fixture.ts  page objects, logger, network/console monitors, auto evidence
  fixtures/data/            JSON + CSV test data
  utils/allure-helper.ts    typed Allure facade, @step decorator, verify(), checkpoint()
  utils/logger.ts           per-test structured logger (attached as execution.log)
  utils/api-interceptor.ts  network capture, timings, failure/latency simulation
  utils/console-monitor.ts  console messages + uncaught page errors
  utils/shop-api-client.ts  storefront API client (each call is an Allure step)
  config/                   environments, global setup/teardown, Allure metadata writer
scripts/                    generate-report, trend-demo, run-and-report, docs tooling
allure-theme/               custom CSS + logo injected into the report
playwright.config.ts        Playwright + reporter configuration
allure-report.config.ts     Allure settings: folders, links, categories, theme
.github/workflows/          GitHub Actions (report on GitHub Pages with history)
Jenkinsfile, docker/, docker-compose.yml
docs/                       tutorial (Markdown + PDF) and screenshots
```

## Commands

| Command | Purpose |
|---|---|
| `npm test` | Run all tests (headless, chromium) |
| `npm run test:headed` / `test:debug` | Visible browser / Playwright Inspector |
| `npm run test:smoke` / `test:regression` | Tag-based subsets |
| `npm run test:auth` · `test:products` · `test:cart` · `test:checkout` · `test:showcase` | Single suites |
| `npm run test:all-browsers` | chromium, firefox, webkit, mobile chrome |
| `npm run test:staging` | Staging environment profile |
| `npm run test:report` | Tests + report (report is generated even if tests fail) |
| `npm run allure:generate` | Report with history, environment, executor, categories and theme |
| `npm run allure:single-file` | One self-contained HTML file |
| `npm run allure:open` / `allure:serve` | Open the report / quick temporary report |
| `npm run trend:demo` | Build several reports to populate trends |
| `npm run clean` / `clean:all` | Remove results and reports (`clean:all` also removes history) |
| `npm run typecheck` | TypeScript check |
| `npm run docs:screenshots` / `docs:pdf` | Rebuild the tutorial images / PDF |
| `npm run docker:test` / `docker:report` | Run in Docker / serve the report on :8080 |

## Configuration

Copy `.env.example` to `.env` or set environment variables:

| Variable | Default | Description |
|---|---|---|
| `TEST_ENV` | `production` | Environment profile (`src/config/environments.ts`) |
| `BASE_URL` | profile | Override the storefront URL |
| `HEADLESS` | `true` | `false` shows the browser |
| `BROWSERS` | `chromium` | `all` = chromium, firefox, webkit, mobile |
| `RETRIES` / `WORKERS` | 1 / 3 locally, 2 / 2 on CI | Execution |
| `VIDEO` / `TRACE` / `SCREENSHOT` | on failure | Evidence capture |
| `ALLURE_DETAIL` | `false` | Also show Playwright API calls and `expect()` as steps |
| `SHOWCASE_FAILURES` | `true` | `false` skips the intentionally failing tests |
| `LOG_LEVEL` | `warn` | Console echo level (the full log is always attached) |

## About the intentional failures

The showcase suite contains tests that fail **on purpose**, so the report shows every Allure status and category:
an assertion failure (*failed*), a timeout (*broken*), a known issue caused by the store's hCaptcha, and a test that
fails on its first attempt and passes on retry (*flaky*). A full run therefore ends with exit code 1.
CI sets `SHOWCASE_FAILURES=false`, so pipelines stay green.

## Notes on the target site

- The customer login is protected by **hCaptcha**, so automated sign-in is not possible. Login tests assert that
  invalid attempts leave the user signed out, and one showcase test documents the limitation as a known issue.
- Checkout runs on Shopify's hosted checkout. Tests fill and validate the form but never enter payment data.

## CI/CD

- **GitHub Actions:** `.github/workflows/playwright-allure.yml` runs the tests, restores history from `gh-pages`,
  generates the report, uploads artifacts and publishes to GitHub Pages.
- **Jenkins:** `Jenkinsfile` uses the project Docker image and the Allure Jenkins plugin (history and trends are built in).
- **Docker:** `docker compose run --rm tests` runs everything in a container with Java included;
  `docker compose up report` serves the report on http://localhost:8080.

See chapter 9 of the tutorial for details.

## Troubleshooting (short list)

- **`JAVA_HOME is set to an invalid directory`**: the report scripts repair this for their own process (they fall back
  to the JDK root or to `java` on the PATH). Fix it permanently by pointing `JAVA_HOME` at the JDK root, not at `bin`.
- **No results after passing `--reporter=…` on the CLI**: a CLI reporter replaces the configured reporters.
  Use `--reporter=list,allure-playwright` or omit the flag.
- **Blank report when double-clicking `allure-report/index.html`**: use `npm run allure:open` or a single-file report.
- **Empty trends**: always generate through `npm run allure:generate`, which restores `allure-history/`.

More in chapter 7 of the tutorial.
