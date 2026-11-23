# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products/catalog.spec.ts >> Product catalog >> Customer can open a product from the catalog
- Location: src/tests/products/catalog.spec.ts:56:7

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('#product-form h1[itemprop="name"]')
Expected: "Grey jacket"
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" locator('#product-form h1[itemprop="name"]') with timeout 10000ms
  - waiting for locator('#product-form h1[itemprop="name"]')

```

```yaml
- heading "Your connection needs to be verified before you can proceed" [level=1]
- main:
  - heading [level=2]
  - paragraph
```

# Test source

```ts
  1  | import { expect, test } from '../../fixtures/base.fixture';
  2  | import { AllureHelper, Severity } from '../../utils/allure-helper';
  3  | import { loadJson } from '../../utils/test-data';
  4  | 
  5  | interface ProductData {
  6  |   catalogSize: number;
  7  |   inStock: Array<{ handle: string; title: string; price: number }>;
  8  | }
  9  | const data = loadJson<ProductData>('products.json');
  10 | 
  11 | test.describe('Product catalog', { tag: ['@products'] }, () => {
  12 |   test.beforeEach(async () => {
  13 |     await AllureHelper.applyMetadata({ epic: 'Web Shop', feature: 'Product Catalog', owner: 'qa-merchandising-team', layer: 'e2e' });
  14 |   });
  15 | 
  16 |   test('Catalog lists every published product', { tag: ['@smoke'] }, async ({ catalogPage }) => {
  17 |     await AllureHelper.applyMetadata({
  18 |       story: 'Browse catalog',
  19 |       severity: Severity.BLOCKER,
  20 |       tms: ['2001'],
  21 |       description: `The "Catalog" page must show all **${data.catalogSize}** products of the store.`,
  22 |     });
  23 | 
  24 |     await catalogPage.open();
  25 |     const products = await catalogPage.getProducts();
  26 |     await AllureHelper.attachCsv('catalog-products.csv', products.map(({ name, priceText, href }) => ({ name, priceText, href })));
  27 | 
  28 |     await AllureHelper.verify(`catalog shows ${data.catalogSize} products`, () => {
  29 |       expect(products, `Expected ${data.catalogSize} product cards`).toHaveLength(data.catalogSize);
  30 |     });
  31 |     await AllureHelper.checkpoint(catalogPage.page, 'Catalog grid', { fullPage: true });
  32 |   });
  33 | 
  34 |   test('Every product card shows a name, a price and an image', { tag: ['@regression'] }, async ({ catalogPage }) => {
  35 |     await AllureHelper.applyMetadata({
  36 |       story: 'Browse catalog',
  37 |       severity: Severity.NORMAL,
  38 |       description: 'Uses **soft assertions** so a single broken card does not hide problems on the others — all findings are reported together.',
  39 |     });
  40 | 
  41 |     await catalogPage.open();
  42 |     const products = await catalogPage.getProducts();
  43 | 
  44 |     await AllureHelper.step(`Check ${products.length} product cards`, async () => {
  45 |       for (const p of products) {
  46 |         await AllureHelper.step(`Card "${p.name || '<no name>'}"`, async (ctx) => {
  47 |           await ctx.parameter('price', p.priceText);
  48 |           expect.soft(p.name, 'product name should not be empty').not.toBe('');
  49 |           expect.soft(p.price, `price of "${p.name}" should be a positive number`).toBeGreaterThan(0);
  50 |           expect.soft(p.imageAlt, `image of "${p.name}" should have alt text`).not.toBe('');
  51 |         });
  52 |       }
  53 |     });
  54 |   });
  55 | 
  56 |   test('Customer can open a product from the catalog', { tag: ['@smoke'] }, async ({ catalogPage, productPage }) => {
  57 |     const target = data.inStock[0];
  58 |     await AllureHelper.applyMetadata({ story: 'Open product details', severity: Severity.CRITICAL, parameters: { product: target.title } });
  59 | 
  60 |     await catalogPage.open();
  61 |     await catalogPage.openProduct(target.title);
  62 | 
  63 |     await AllureHelper.verify(`product page for "${target.title}" is displayed`, async () => {
> 64 |       await expect(productPage.titleHeading).toHaveText(target.title);
     |                                              ^ Error: expect(locator).toHaveText(expected) failed
  65 |       await expect(productPage.page).toHaveURL(new RegExp(`/products/${target.handle}`));
  66 |     });
  67 |     await AllureHelper.checkpoint(productPage.page, `${target.title} details`);
  68 |   });
  69 | 
  70 |   test('Header navigation leads from home page to catalog', { tag: ['@regression'] }, async ({ homePage, catalogPage }) => {
  71 |     await AllureHelper.applyMetadata({ story: 'Browse catalog', severity: Severity.TRIVIAL });
  72 | 
  73 |     await homePage.open();
  74 |     await homePage.goToCatalog();
  75 | 
  76 |     await AllureHelper.verify('catalog grid is visible after navigation', async () => {
  77 |       await expect(catalogPage.productCards.first()).toBeVisible();
  78 |     });
  79 |   });
  80 | });
  81 | 
```