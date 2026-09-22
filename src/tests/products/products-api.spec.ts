import { expect, test } from '@playwright/test';
import { config } from '../../config';
import { AllureHelper, Severity } from '../../utils/allure-helper';
import { loadJson } from '../../utils/test-data';
import { ShopApiClient } from '../../utils/shop-api-client';

/**
 * Pure API tests: they use Playwright's `request` fixture only (no browser page),
 * which is why they import the plain Playwright `test` instead of the UI fixtures.
 */
const data = loadJson<{ catalogSize: number; soldOut: Array<{ handle: string }> }>('products.json');

test.describe('Storefront API', { tag: ['@api', '@products'] }, () => {
  test.beforeEach(async () => {
    await AllureHelper.applyMetadata({ epic: 'Web Shop', feature: 'Product Catalog API', owner: 'qa-platform-team', layer: 'api' });
  });

  test('GET /products.json returns the full catalog quickly', { tag: ['@smoke'] }, async ({ request }) => {
    await AllureHelper.applyMetadata({
      story: 'Catalog API',
      severity: Severity.CRITICAL,
      links: [{ url: 'https://shopify.dev/docs/api/ajax/reference/product', name: 'Shopify AJAX API docs', type: 'docs' }],
    });
    const api = new ShopApiClient(request);

    const { status, durationMs, body } = await api.getProducts();

    await AllureHelper.verify('status is 200', () => expect(status).toBe(200));
    await AllureHelper.verify(`catalog has ${data.catalogSize} products`, () => expect(body.products).toHaveLength(data.catalogSize));
    await AllureHelper.verify(`responds within 3000 ms (took ${durationMs} ms)`, () => expect(durationMs).toBeLessThan(3_000));
    await AllureHelper.attachCsv(
      'products-from-api.csv',
      body.products.map((p) => ({ handle: p.handle, title: p.title, vendor: p.vendor, type: p.product_type, variants: p.variants.length, price: p.variants[0]?.price })),
    );
  });

  test('Every product exposes a valid schema', { tag: ['@regression'] }, async ({ request }) => {
    await AllureHelper.applyMetadata({ story: 'Catalog API', severity: Severity.NORMAL });
    const { body } = await new ShopApiClient(request).getProducts();

    for (const p of body.products) {
      await AllureHelper.step(`Validate schema of "${p.handle}"`, () => {
        expect.soft(p.id, 'id').toEqual(expect.any(Number));
        expect.soft(p.title, 'title').toEqual(expect.any(String));
        expect.soft(p.variants.length, 'at least one variant').toBeGreaterThan(0);
        for (const v of p.variants) expect.soft(Number(v.price), `price of variant ${v.id}`).toBeGreaterThan(0);
      });
    }
  });

  test('Sold-out products are flagged as unavailable by the API', { tag: ['@regression'] }, async ({ request }) => {
    await AllureHelper.applyMetadata({ story: 'Stock availability', severity: Severity.NORMAL, issues: ['17'] });
    const { body } = await new ShopApiClient(request).getProducts();

    for (const { handle } of data.soldOut) {
      const product = body.products.find((p) => p.handle === handle);
      await AllureHelper.verify(`"${handle}" has no available variant`, () => {
        expect(product, `product ${handle} should exist`).toBeDefined();
        expect(product!.variants.every((v) => !v.available)).toBe(true);
      });
    }
  });

  test('Unknown product handle answers HTTP 404', { tag: ['@regression', '@negative'] }, async ({ request }) => {
    await AllureHelper.applyMetadata({ story: 'Error handling', severity: Severity.MINOR, parameters: { baseURL: config.baseURL } });
    const response = await new ShopApiClient(request).raw('GET', '/products/definitely-not-here.js');
    await AllureHelper.attachText('Response body', (await response.text()).slice(0, 2_000));
    await AllureHelper.verify('status is 404', () => expect(response.status()).toBe(404));
  });
});
