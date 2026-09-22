import { expect, test } from '../../fixtures/base.fixture';
import { allure, AllureHelper, Severity } from '../../utils/allure-helper';
import { loadCsv, loadJson, readDataFile } from '../../utils/test-data';

interface Customer extends Record<string, string> {
  label: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postcode: string;
}

const customers = loadCsv<Customer>('checkout-customers.csv');
const { inStock } = loadJson<{ inStock: Array<{ handle: string; title: string; price: number }> }>('products.json');
const [jacket, top] = inStock;

/**
 * Checkout runs on Shopify's hosted checkout. The tests stop before payment:
 * no card data is ever entered, so no order can be placed.
 */
test.describe('Checkout', { tag: ['@checkout'] }, () => {
  test.beforeEach(async ({ shopApi }) => {
    await AllureHelper.applyMetadata({ epic: 'Web Shop', feature: 'Checkout', owner: 'qa-checkout-team', layer: 'e2e' });
    await AllureHelper.step('Precondition: cart contains a Grey jacket and a Striped top (via API)', async () => {
      for (const handle of [jacket.handle, top.handle]) {
        const product = await shopApi.getProduct(handle);
        await shopApi.addToCart(product.body.variants[0].id, 1);
      }
    });
  });

  test('Customer reaches checkout with the correct order summary', { tag: ['@smoke'] }, async ({ cartPage, checkoutPage }) => {
    await AllureHelper.applyMetadata({
      story: 'Start checkout',
      severity: Severity.BLOCKER,
      tms: ['4001'],
      links: [{ url: 'https://help.shopify.com/en/manual/checkout-settings', name: 'Shopify checkout settings', type: 'docs' }],
    });

    await cartPage.open();
    const cartTotal = await cartPage.getTotal();
    await cartPage.proceedToCheckout();
    await checkoutPage.waitForReady();

    await AllureHelper.verify('both products are listed in the order summary', async () => {
      await expect(checkoutPage.page.getByText(jacket.title, { exact: true }).first()).toBeVisible();
      await expect(checkoutPage.page.getByText(top.title, { exact: true }).first()).toBeVisible();
    });
    const subtotal = await checkoutPage.getSubtotal();
    await AllureHelper.verify(`checkout subtotal £${subtotal.toFixed(2)} equals cart total £${cartTotal.toFixed(2)}`, () =>
      expect(subtotal).toBeCloseTo(cartTotal, 2),
    );
    await AllureHelper.checkpoint(checkoutPage.page, 'Checkout – order summary');
  });

  test('Pay now with an empty form lists every required field', { tag: ['@regression', '@negative', '@validation'] }, async ({ cartPage, checkoutPage }) => {
    await AllureHelper.applyMetadata({ story: 'Checkout validation', severity: Severity.CRITICAL });
    const required = ['Enter an email', 'Enter a last name', 'Enter an address', 'Enter a city', 'postal code', 'card number'];

    await cartPage.open();
    await cartPage.proceedToCheckout();
    await checkoutPage.waitForReady();
    await checkoutPage.submitWithoutPayment();
    const errors = await checkoutPage.getFieldErrors();
    await AllureHelper.attachJson('Validation messages', errors);

    for (const message of required) {
      await AllureHelper.verify(`error mentions "${message}"`, () => expect(errors.join(' | ')).toContain(message));
    }
    await AllureHelper.checkpoint(checkoutPage.page, 'Checkout validation errors', { fullPage: true });
  });

  test('An invalid discount code is rejected', { tag: ['@regression', '@negative'] }, async ({ cartPage, checkoutPage }) => {
    const code = 'NOT-A-REAL-CODE';
    await AllureHelper.applyMetadata({ story: 'Discounts', severity: Severity.NORMAL, parameters: { code } });

    await cartPage.open();
    await cartPage.proceedToCheckout();
    await checkoutPage.waitForReady();
    await checkoutPage.applyDiscount(code);

    await AllureHelper.verify('"Enter a valid discount code" is displayed', () =>
      expect(checkoutPage.page.getByText('Enter a valid discount code').first()).toBeVisible(),
    );
  });

  // Data-driven from CSV: one test per row, the CSV itself is attached as evidence.
  for (const customer of customers) {
    test(`Shipping details are accepted for ${customer.label}`, { tag: ['@regression', '@data-driven'] }, async ({ cartPage, checkoutPage }) => {
      await AllureHelper.applyMetadata({ story: 'Enter shipping details', severity: Severity.NORMAL });
      await allure.parameter('customer', customer.label);
      await allure.parameter('city', customer.city);
      await allure.parameter('email', customer.email, { mode: 'masked' });
      await AllureHelper.attachCsv('checkout-customers.csv (data source)', readDataFile('checkout-customers.csv'));

      await cartPage.open();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForReady();
      await checkoutPage.fillShipping(customer.label, customer);

      await AllureHelper.verify('all shipping fields keep the entered values', async () => {
        await expect(checkoutPage.email).toHaveValue(customer.email);
        await expect(checkoutPage.lastName).toHaveValue(customer.lastName);
        await expect(checkoutPage.city).toHaveValue(customer.city);
        await expect(checkoutPage.postcode).toHaveValue(customer.postcode);
      });
      await AllureHelper.verify('no field-level errors are displayed', () => expect(checkoutPage.fieldErrors).toHaveCount(0));
      await AllureHelper.checkpoint(checkoutPage.page, `Shipping details – ${customer.label}`);
    });
  }
});
