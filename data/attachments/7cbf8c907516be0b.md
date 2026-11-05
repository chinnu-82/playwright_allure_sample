# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products/products-api.spec.ts >> Storefront API >> Unknown product handle answers HTTP 404
- Location: src/tests/products/products-api.spec.ts:64:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 404
Received: 429
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { config } from '../../config';
  3  | import { AllureHelper, Severity } from '../../utils/allure-helper';
  4  | import { loadJson } from '../../utils/test-data';
  5  | import { ShopApiClient } from '../../utils/shop-api-client';
  6  | 
  7  | /**
  8  |  * Pure API tests: they use Playwright's `request` fixture only (no browser page),
  9  |  * which is why they import the plain Playwright `test` instead of the UI fixtures.
  10 |  */
  11 | const data = loadJson<{ catalogSize: number; soldOut: Array<{ handle: string }> }>('products.json');
  12 | 
  13 | test.describe('Storefront API', { tag: ['@api', '@products'] }, () => {
  14 |   test.beforeEach(async () => {
  15 |     await AllureHelper.applyMetadata({ epic: 'Web Shop', feature: 'Product Catalog API', owner: 'qa-platform-team', layer: 'api' });
  16 |   });
  17 | 
  18 |   test('GET /products.json returns the full catalog quickly', { tag: ['@smoke'] }, async ({ request }) => {
  19 |     await AllureHelper.applyMetadata({
  20 |       story: 'Catalog API',
  21 |       severity: Severity.CRITICAL,
  22 |       links: [{ url: 'https://shopify.dev/docs/api/ajax/reference/product', name: 'Shopify AJAX API docs', type: 'docs' }],
  23 |     });
  24 |     const api = new ShopApiClient(request);
  25 | 
  26 |     const { status, durationMs, body } = await api.getProducts();
  27 | 
  28 |     await AllureHelper.verify('status is 200', () => expect(status).toBe(200));
  29 |     await AllureHelper.verify(`catalog has ${data.catalogSize} products`, () => expect(body.products).toHaveLength(data.catalogSize));
  30 |     await AllureHelper.verify(`responds within 3000 ms (took ${durationMs} ms)`, () => expect(durationMs).toBeLessThan(3_000));
  31 |     await AllureHelper.attachCsv(
  32 |       'products-from-api.csv',
  33 |       body.products.map((p) => ({ handle: p.handle, title: p.title, vendor: p.vendor, type: p.product_type, variants: p.variants.length, price: p.variants[0]?.price })),
  34 |     );
  35 |   });
  36 | 
  37 |   test('Every product exposes a valid schema', { tag: ['@regression'] }, async ({ request }) => {
  38 |     await AllureHelper.applyMetadata({ story: 'Catalog API', severity: Severity.NORMAL });
  39 |     const { body } = await new ShopApiClient(request).getProducts();
  40 | 
  41 |     for (const p of body.products) {
  42 |       await AllureHelper.step(`Validate schema of "${p.handle}"`, () => {
  43 |         expect.soft(p.id, 'id').toEqual(expect.any(Number));
  44 |         expect.soft(p.title, 'title').toEqual(expect.any(String));
  45 |         expect.soft(p.variants.length, 'at least one variant').toBeGreaterThan(0);
  46 |         for (const v of p.variants) expect.soft(Number(v.price), `price of variant ${v.id}`).toBeGreaterThan(0);
  47 |       });
  48 |     }
  49 |   });
  50 | 
  51 |   test('Sold-out products are flagged as unavailable by the API', { tag: ['@regression'] }, async ({ request }) => {
  52 |     await AllureHelper.applyMetadata({ story: 'Stock availability', severity: Severity.NORMAL, issues: ['17'] });
  53 |     const { body } = await new ShopApiClient(request).getProducts();
  54 | 
  55 |     for (const { handle } of data.soldOut) {
  56 |       const product = body.products.find((p) => p.handle === handle);
  57 |       await AllureHelper.verify(`"${handle}" has no available variant`, () => {
  58 |         expect(product, `product ${handle} should exist`).toBeDefined();
  59 |         expect(product!.variants.every((v) => !v.available)).toBe(true);
  60 |       });
  61 |     }
  62 |   });
  63 | 
  64 |   test('Unknown product handle answers HTTP 404', { tag: ['@regression', '@negative'] }, async ({ request }) => {
  65 |     await AllureHelper.applyMetadata({ story: 'Error handling', severity: Severity.MINOR, parameters: { baseURL: config.baseURL } });
  66 |     const response = await new ShopApiClient(request).raw('GET', '/products/definitely-not-here.js');
  67 |     await AllureHelper.attachText('Response body', (await response.text()).slice(0, 2_000));
> 68 |     await AllureHelper.verify('status is 404', () => expect(response.status()).toBe(404));
     |                                                                                ^ Error: expect(received).toBe(expected) // Object.is equality
  69 |   });
  70 | });
  71 | 
```