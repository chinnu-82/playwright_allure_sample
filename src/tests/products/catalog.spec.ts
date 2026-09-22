import { expect, test } from '../../fixtures/base.fixture';
import { AllureHelper, Severity } from '../../utils/allure-helper';
import { loadJson } from '../../utils/test-data';

interface ProductData {
  catalogSize: number;
  inStock: Array<{ handle: string; title: string; price: number }>;
}
const data = loadJson<ProductData>('products.json');

test.describe('Product catalog', { tag: ['@products'] }, () => {
  test.beforeEach(async () => {
    await AllureHelper.applyMetadata({ epic: 'Web Shop', feature: 'Product Catalog', owner: 'qa-merchandising-team', layer: 'e2e' });
  });

  test('Catalog lists every published product', { tag: ['@smoke'] }, async ({ catalogPage }) => {
    await AllureHelper.applyMetadata({
      story: 'Browse catalog',
      severity: Severity.BLOCKER,
      tms: ['2001'],
      description: `The "Catalog" page must show all **${data.catalogSize}** products of the store.`,
    });

    await catalogPage.open();
    const products = await catalogPage.getProducts();
    await AllureHelper.attachCsv('catalog-products.csv', products.map(({ name, priceText, href }) => ({ name, priceText, href })));

    await AllureHelper.verify(`catalog shows ${data.catalogSize} products`, () => {
      expect(products, `Expected ${data.catalogSize} product cards`).toHaveLength(data.catalogSize);
    });
    await AllureHelper.checkpoint(catalogPage.page, 'Catalog grid', { fullPage: true });
  });

  test('Every product card shows a name, a price and an image', { tag: ['@regression'] }, async ({ catalogPage }) => {
    await AllureHelper.applyMetadata({
      story: 'Browse catalog',
      severity: Severity.NORMAL,
      description: 'Uses **soft assertions** so a single broken card does not hide problems on the others — all findings are reported together.',
    });

    await catalogPage.open();
    const products = await catalogPage.getProducts();

    await AllureHelper.step(`Check ${products.length} product cards`, async () => {
      for (const p of products) {
        await AllureHelper.step(`Card "${p.name || '<no name>'}"`, async (ctx) => {
          await ctx.parameter('price', p.priceText);
          expect.soft(p.name, 'product name should not be empty').not.toBe('');
          expect.soft(p.price, `price of "${p.name}" should be a positive number`).toBeGreaterThan(0);
          expect.soft(p.imageAlt, `image of "${p.name}" should have alt text`).not.toBe('');
        });
      }
    });
  });

  test('Customer can open a product from the catalog', { tag: ['@smoke'] }, async ({ catalogPage, productPage }) => {
    const target = data.inStock[0];
    await AllureHelper.applyMetadata({ story: 'Open product details', severity: Severity.CRITICAL, parameters: { product: target.title } });

    await catalogPage.open();
    await catalogPage.openProduct(target.title);

    await AllureHelper.verify(`product page for "${target.title}" is displayed`, async () => {
      await expect(productPage.titleHeading).toHaveText(target.title);
      await expect(productPage.page).toHaveURL(new RegExp(`/products/${target.handle}`));
    });
    await AllureHelper.checkpoint(productPage.page, `${target.title} details`);
  });

  test('Header navigation leads from home page to catalog', { tag: ['@regression'] }, async ({ homePage, catalogPage }) => {
    await AllureHelper.applyMetadata({ story: 'Browse catalog', severity: Severity.TRIVIAL });

    await homePage.open();
    await homePage.goToCatalog();

    await AllureHelper.verify('catalog grid is visible after navigation', async () => {
      await expect(catalogPage.productCards.first()).toBeVisible();
    });
  });
});
