/**
 * Build docs/Playwright-Allure-Tutorial.pdf from docs/tutorial/TUTORIAL.md.
 *
 *   npm run docs:pdf
 *
 * Markdown -> HTML (marked + highlight.js) -> PDF (Chromium via Playwright).
 */
import { chromium } from '@playwright/test';
import hljs from 'highlight.js';
import { Marked, type Tokens } from 'marked';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(__dirname, '../..');
const srcFile = path.join(root, 'docs', 'tutorial', 'TUTORIAL.md');
const cssFile = path.join(root, 'docs', 'tutorial', 'tutorial.css');
const htmlFile = path.join(root, 'docs', 'tutorial', 'tutorial.html');
const pdfFile = path.join(root, 'docs', 'Playwright-Allure-Tutorial.pdf');

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const headings: Array<{ level: number; text: string; id: string }> = [];

const marked = new Marked({
  renderer: {
    code({ text, lang }: Tokens.Code): string {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const html = hljs.highlight(text, { language }).value;
      const label = lang ? `<span class="code-lang">${lang}</span>` : '';
      return `<pre class="code">${label}<code class="hljs language-${language}">${html}</code></pre>\n`;
    },
    heading({ tokens, depth }: Tokens.Heading): string {
      const text = this.parser.parseInline(tokens);
      const id = slug(text);
      if (depth <= 2) headings.push({ level: depth, text: text.replace(/<[^>]+>/g, ''), id });
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },
    image({ href, title, text }: Tokens.Image): string {
      const caption = title ?? text;
      return `<figure><img src="${href}" alt="${text}"/>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
    },
  },
});

async function main(): Promise<void> {
  const markdown = fs.readFileSync(srcFile, 'utf-8');
  // Everything before the first "# " heading after the cover marker is the cover page.
  const [cover, ...rest] = markdown.split('<!-- end-cover -->');
  const coverHtml = await marked.parse(cover);
  headings.length = 0; // the cover title is not part of the table of contents
  const bodyHtml = await marked.parse(rest.join(''));

  const toc = headings
    .map((h) => `<li class="toc-l${h.level}"><a href="#${h.id}">${h.text}</a></li>`)
    .join('\n');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Playwright + Allure Reporting Tutorial</title>
<style>${fs.readFileSync(cssFile, 'utf-8')}</style></head>
<body>
<section class="cover">${coverHtml}</section>
<section class="toc"><h1>Contents</h1><ol>${toc}</ol></section>
<main>${bodyHtml}</main>
</body></html>`;
  fs.writeFileSync(htmlFile, html);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
  await page.pdf({
    path: pdfFile,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:8px;width:100%;padding:0 16mm;color:#94a3b8;font-family:Segoe UI,Arial">Playwright + Allure Reporting — Tutorial</div>`,
    footerTemplate: `<div style="font-size:8px;width:100%;padding:0 16mm;color:#94a3b8;font-family:Segoe UI,Arial;text-align:right">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    outline: true,
    tagged: true,
  });
  await browser.close();
  console.log(`✅ ${path.relative(root, pdfFile)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
