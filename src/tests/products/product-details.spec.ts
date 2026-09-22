import { expect, test } from '../../fixtures/base.fixture';
import { allure, AllureHelper, Severity } from '../../utils/allure-helper';
import { loadJson } from '../../utils/test-data';

interface ProductData {
  inStock: Array<{ handle: string; title: string; price: number; vendor: string }>;
  withVariants: { handle: string; title: string; price: number; options: Record<string, string[]> };
  soldOut: Array<{ handle: string; title: string; price: number }>;
  missingHandle: string;
}
const data = loadJson<ProductData>('products.json');

test.describe('Product details', { tag: ['@products'] }, () => {
  test.beforeEach(async () => {
    await AllureHelper.applyMetadata({ epic: 'Web Shop', feature: 'Product Catalog', owner: 'qa-merchandising-team', layer: 'e2e' });
  });

  // Data-driven: one Allure test per product, parameters shown in the report.
  for (const product of data.inStock) {
    test(`Product page shows correct title and price for ${product.title}`, { tag: ['@regression'] }, async ({ productPage, shopApi }) => {
      await AllureHelper.applyMetadata({
        story: 'Open product details',
        severity: Severity.CRITICAL,
        parameters: { handle: product.handle, 'expected price': product.price.toFixed(2) },
        description: 'Cross-checks the **UI** against the storefront **API** (`/products/<handle>.js`) and the test data file.',
      });

      const api = await shopApi.getProduct(product.handle);
      await productPage.openByHandle(product.handle);
      await productPage.waitForReady();

      const uiTitle = await productPage.getTitle();
      const uiPrice = await productPage.getPrice();
      await AllureHelper.attachJson('Comparison UI vs API vs test data', {
        title: { ui: uiTitle, api: api.body.title, expected: product.title },
        price: { ui: uiPrice, api: Number(api.body.variants[0].price) / 100, expected: product.price },
      });

      await AllureHelper.verify(`title is "${product.title}"`, () => expect(uiTitle).toBe(product.title));
      await AllureHelper.verify(`price is £${product.price.toFixed(2)}`, () => expect(uiPrice).toBeCloseTo(product.price, 2));
      await AllureHelper.verify('UI title matches the API title', () => expect(uiTitle).toBe(api.body.title));
      await AllureHelper.verify('"Add To Cart" is enabled for an in-stock product', () => expect(productPage.addToCartButton).toBeEnabled());
    });
  }

  test('Variant selectors expose every size and colour', { tag: ['@regression'] }, async ({ productPage }) => {
    const p = data.withVariants;
    await AllureHelper.applyMetadata({ story: 'Choose product variant', severity: Severity.NORMAL, parameters: { product: p.title } });

    await productPage.openByHandle(p.handle);
    await productPage.waitForReady();

    const sizes = await productPage.getOptionValues(0);
    const colours = await productPage.getOptionValues(1);
    await AllureHelper.verify(`sizes are ${p.options.Size.join('/')}`, () => expect(sizes).toEqual(p.options.Size));
    await AllureHelper.verify(`colours are ${p.options.Color.join('/')}`, () => expect(colours).toEqual(p.options.Color));

    const before = await productPage.selectedVariantId();
    await productPage.selectOption('Size', 'L');
    await productPage.selectOption('Color', 'Red');
    const after = await productPage.selectedVariantId();
    await allure.parameter('variant id (L / Red)', after);

    await AllureHelper.verify('choosing L / Red switches the underlying variant', () => expect(after).not.toBe(before));
    await AllureHelper.checkpoint(productPage.page, 'Variant L / Red selected');
  });

  for (const product of data.soldOut) {
    test(`Sold-out product "${product.title}" cannot be added to the cart`, { tag: ['@regression', '@negative'] }, async ({ productPage }) => {
      await AllureHelper.applyMetadata({
        story: 'Stock availability',
        severity: Severity.CRITICAL,
        issues: ['17'],
        parameters: { handle: product.handle },
      });

      await productPage.openByHandle(product.handle);
      await productPage.waitForReady();

      await AllureHelper.verify('button reads "Sold Out"', () => expect(productPage.addToCartButton).toHaveValue('Sold Out'));
      await AllureHelper.verify('button is disabled', () => expect(productPage.addToCartButton).toBeDisabled());
      await AllureHelper.attachElementScreenshot(productPage.addToCartButton, 'Sold-out button');
    });
  }

  test('Unknown product URL shows the 404 page', { tag: ['@regression', '@negative'] }, async ({ productPage }) => {
    await AllureHelper.applyMetadata({ story: 'Error pages', severity: Severity.MINOR });

    const status = await productPage.openByHandle(data.missingHandle);
    await allure.parameter('HTTP status', String(status));

    await AllureHelper.verify('server answers HTTP 404', () => expect(status).toBe(404));
    await AllureHelper.verify('friendly error message is shown', () => expect(productPage.notFoundMessage).toBeVisible());
    await AllureHelper.checkpoint(productPage.page, '404 page');
  });
});
