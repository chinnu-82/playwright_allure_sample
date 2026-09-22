# Sample report

`allure-report-single-file.html` is a complete, self-contained Allure report produced by this project
(build #6 of a local history of 6 builds). Open it by double-clicking it; no server is needed.

What to look at:

| Where | What it demonstrates |
|---|---|
| Overview | Statistics, **Trend** over 6 builds, Categories, Environment (incl. browser version), Executor |
| Categories | Product defect vs known issue (hCaptcha) vs timeout, grouped by regex rules |
| Behaviors | Epic → feature → story coverage (Web Shop, Allure Showcase) |
| Graphs | Status, severity, duration, and the duration/retries/categories trends |
| Timeline | Parallel execution across 3 workers |
| `Allure feature showcase › Result statuses` | failed, broken, skipped, flaky (Retries tab), expected failure |
| `Custom attachments…` | JSON, CSV, XML, HTML, SVG, URI list, log file, screenshots, HTML snapshot |
| `Full shopping journey…` | Checkpoint screenshots, video and Playwright trace |
| `Add to cart fails gracefully…` | Network log, failed (aborted) request, API payloads |
| Any test › After Hooks | Network summary/log, console output, execution log |

The file is large (~55 MB) because videos and traces are embedded. Regenerate your own with:

```bash
npm run test:report
npx tsx scripts/generate-report.ts --single-file --no-history-save
```
