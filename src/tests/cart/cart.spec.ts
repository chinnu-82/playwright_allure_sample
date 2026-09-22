import { expect, test } from '../../fixtures/base.fixture';
import { allure, AllureHelper, Severity } from '../../utils/allure-helper';
import { loadJson } from '../../utils/test-data';

interface ProductData {
  inStock: Array<{ handle: string; title: string; price: number }>;
}
const { inStock } = loadJson<ProductData>('products.json');
const [jacket, top] = inStock;

test.describe('Shopping cart', { tag: ['@cart'] }, () => {
  test.beforeEach(async () => {
    await AllureHelper.applyMetadata({ epic: 'Web Shop', feature: 'Shopping Cart', owner: 'qa-checkout-team', layer: 'e2e' });
  });

  test('A new visitor starts with an empty cart', { tag: ['@regression'] }, async ({ cartPage }) => {
    await AllureHelper.applyMetadata({ story: 'View cart', severity: Severity.MINOR });

    await cartPage.open();

    await AllureHelper.verify('"your cart is currently empty" message is shown', () => expect(cartPage.emptyMessage).toBeVisible());
    await AllureHelper.verify('header counter shows (0)', () => cartPage.expectCartCount(0));
  });

  test('Adding a product updates the header cart counter', { tag: ['@smoke'] }, async ({ productPage, cartPage }) => {
    await AllureHelper.applyMetadata({
      story: 'Add to cart',
      severity: Severity.BLOCKER,
      tms: ['3001'],
      parameters: { product: jacket.title },
    });

    await productPage.openByHandle(jacket.handle);
    await productPage.waitForReady();
    await productPage.addToCart();

    await AllureHelper.verify('header counter shows (1)', () => productPage.expectCartCount(1));

    await cartPage.open();
    const lines = await cartPage.getLines();
    await AllureHelper.verify(`cart contains exactly "${jacket.title}"`, () => {
      expect(lines).toHaveLength(1);
      expect(lines[0].name).toContain(jacket.title);
      expect(lines[0].quantity).toBe(1);
    });
    await AllureHelper.checkpoint(cartPage.page, 'Cart with one item');
  });

  test('Cart total equals the sum of all line totals', { tag: ['@regression'] }, async ({ productPage, cartPage }) => {
    await AllureHelper.applyMetadata({ story: 'Add to cart', severity: Severity.CRITICAL, parameters: { products: `${jacket.title}, ${top.title}` } });

    for (const product of [jacket, top]) {
      await productPage.openByHandle(product.handle);
      await productPage.waitForReady();
      await productPage.addToCart();
    }

    await cartPage.open();
    const lines = await cartPage.getLines();
    const total = await cartPage.getTotal();
    const expected = jacket.price + top.price;
    await AllureHelper.attachCsv('cart-lines.csv', lines.map((l) => ({ ...l })));

    await AllureHelper.verify('two lines are in the cart', () => expect(lines).toHaveLength(2));
    await AllureHelper.verify(`total £${total.toFixed(2)} = sum of lines £${expected.toFixed(2)}`, () => {
      expect(total).toBeCloseTo(lines.reduce((s, l) => s + l.lineTotal, 0), 2);
      expect(total).toBeCloseTo(expected, 2);
    });
    await AllureHelper.attachElementScreenshot(cartPage.cartSection, 'Cart section');
  });

  test('Changing the quantity recalculates line and cart totals', { tag: ['@regression'] }, async ({ shopApi, cartPage }) => {
    await AllureHelper.applyMetadata({
      story: 'Update quantity',
      severity: Severity.CRITICAL,
      description: 'Setup is done through the storefront **API** (fast, not under test); only the quantity change is exercised in the UI.',
    });

    const product = await shopApi.getProduct(jacket.handle);
    await shopApi.addToCart(product.body.variants[0].id, 1);

    await cartPage.open();
    await cartPage.setQuantity(0, 3);
    const [line] = await cartPage.getLines();
    const total = await cartPage.getTotal();
    await allure.parameter('new quantity', '3');

    await AllureHelper.verify('quantity input shows 3', () => expect(line.quantity).toBe(3));
    await AllureHelper.verify(`line total is 3 × £${jacket.price}`, () => expect(line.lineTotal).toBeCloseTo(jacket.price * 3, 2));
    await AllureHelper.verify('cart total follows the line total', () => expect(total).toBeCloseTo(jacket.price * 3, 2));
  });

  test('Removing the only item empties the cart', { tag: ['@regression'] }, async ({ shopApi, cartPage }) => {
    await AllureHelper.applyMetadata({ story: 'Remove from cart', severity: Severity.NORMAL });

    const product = await shopApi.getProduct(top.handle);
    await shopApi.addToCart(product.body.variants[0].id, 1);

    await cartPage.open();
    await AllureHelper.verify('cart starts with one line', () => expect(cartPage.lines).toHaveCount(1));
    await cartPage.removeLine(0);

    await AllureHelper.verify('"your cart is currently empty" message is shown', () => expect(cartPage.emptyMessage).toBeVisible());
    const cart = await shopApi.getCart();
    await AllureHelper.verify('API agrees: item_count is 0', () => expect(cart.body.item_count).toBe(0));
  });

  test('UI cart and /cart.js API stay in sync', { tag: ['@regression', '@api'] }, async ({ productPage, shopApi }) => {
    await AllureHelper.applyMetadata({ story: 'View cart', severity: Severity.NORMAL, layer: 'e2e' });

    await productPage.openByHandle(top.handle);
    await productPage.waitForReady();
    await productPage.addToCart();

    const { body } = await shopApi.getCart();
    await AllureHelper.verify('API reports one item', () => expect(body.item_count).toBe(1));
    await AllureHelper.verify(`API line is "${top.title}"`, () => expect(body.items[0].handle).toBe(top.handle));
    await AllureHelper.verify('API total (pence) matches catalog price', () => expect(body.total_price).toBe(Math.round(top.price * 100)));
  });

  test('Add to cart fails gracefully when the cart service is unreachable', { tag: ['@regression', '@negative', '@resilience'] }, async ({ productPage, network, shopApi }) => {
    await AllureHelper.applyMetadata({
      story: 'Add to cart',
      severity: Severity.NORMAL,
      description:
        'Uses `page.route()` to **abort** `/cart/add.js`, simulating an outage. The failed request is visible in the ' +
        '"Failed network requests" attachment and the cart must remain empty.',
    });

    await network.simulateNetworkFailure('**/cart/add.js');
    await productPage.openByHandle(jacket.handle);
    await productPage.waitForReady();
    await productPage.clickAddToCart();

    await AllureHelper.step('Wait for the aborted request to be recorded', async () => {
      await expect.poll(() => network.find('/cart/add.js').filter((e) => e.outcome === 'failed').length, {
        message: 'the add-to-cart request should be aborted',
      }).toBeGreaterThan(0);
    });
    const { body } = await shopApi.getCart();
    await AllureHelper.verify('server-side cart is still empty', () => expect(body.item_count).toBe(0));
    await AllureHelper.verify('header counter still shows (0)', () => productPage.expectCartCount(0));
    await AllureHelper.checkpoint(productPage.page, 'After failed add-to-cart');
  });
});
