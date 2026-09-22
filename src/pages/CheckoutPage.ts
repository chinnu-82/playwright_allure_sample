import { expect, type Locator } from '@playwright/test';
import { step } from '../utils/allure-helper';
import { parsePrice } from '../utils/test-data';
import { BasePage } from './BasePage';

export interface ShippingDetails {
  email: string;
  firstName?: string;
  lastName: string;
  address: string;
  city: string;
  postcode: string;
}

/**
 * Shopify's hosted one-page checkout (/checkouts/cn/...).
 *
 * The framework never enters card data, so pressing "Pay now" can only
 * trigger client-side validation — no order is ever placed.
 */
export class CheckoutPage extends BasePage {
  protected readonly path = '/checkout';

  readonly contactHeading: Locator = this.page.getByRole('heading', { name: 'Contact' });
  readonly deliveryHeading: Locator = this.page.getByRole('heading', { name: 'Delivery' });
  readonly email: Locator = this.page.locator('input[name="email"]').first();
  readonly firstName: Locator = this.page.locator('input[name="firstName"]:visible').first();
  readonly lastName: Locator = this.page.locator('input[name="lastName"]:visible').first();
  readonly address: Locator = this.page.locator('input[name="address1"]:visible').first();
  readonly city: Locator = this.page.locator('input[name="city"]:visible').first();
  readonly postcode: Locator = this.page.locator('input[name="postalCode"]:visible').first();
  readonly payNowButton: Locator = this.page.locator('#checkout-pay-button');
  readonly discountInput: Locator = this.page.getByPlaceholder('Discount code').first();
  readonly applyDiscountButton: Locator = this.page.getByRole('button', { name: 'Apply' }).first();
  readonly fieldErrors: Locator = this.page.locator('[id^="error-for-"]:visible');
  readonly orderSummary: Locator = this.page.locator('aside, [role="complementary"]').first();

  override async waitForReady(): Promise<void> {
    await expect(this.page, 'Browser should be on the Shopify checkout').toHaveURL(/\/checkouts\//);
    await expect(this.contactHeading, 'Checkout "Contact" section should be visible').toBeVisible({ timeout: 30_000 });
  }

  @step('Fill shipping details for {0}')
  async fillShipping(label: string, details: ShippingDetails): Promise<void> {
    this.logger.data(`shipping.${label}`, details);
    await this.email.fill(details.email);
    if (details.firstName) await this.firstName.fill(details.firstName);
    await this.lastName.fill(details.lastName);
    await this.address.fill(details.address);
    // Shopify opens an address-autocomplete popup; dismiss it before moving on.
    await this.address.press('Escape');
    await this.city.fill(details.city);
    await this.postcode.fill(details.postcode);
  }

  @step('Press "Pay now" (validation only — no card data is entered)')
  async submitWithoutPayment(): Promise<void> {
    await this.payNowButton.click();
  }

  @step('Collect visible field validation errors')
  async getFieldErrors(): Promise<string[]> {
    await this.fieldErrors.first().waitFor({ state: 'visible' });
    const errors = (await this.fieldErrors.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    this.logger.data('checkout.fieldErrors', errors);
    return errors;
  }

  @step('Apply discount code "{0}"')
  async applyDiscount(code: string): Promise<void> {
    await this.discountInput.fill(code);
    await this.applyDiscountButton.click();
  }

  /** Reads "Subtotal … £105.00" from the order summary text. */
  @step('Read order subtotal')
  async getSubtotal(): Promise<number> {
    const text = await this.page.locator('body').innerText();
    const match = text.match(/Subtotal[^\n]*\n\s*([^\n]+)/);
    if (!match) throw new Error('Subtotal not found in checkout summary');
    const subtotal = parsePrice(match[1]);
    this.logger.data('checkout.subtotal', subtotal);
    return subtotal;
  }

  async summaryContains(productName: string): Promise<boolean> {
    return this.page.getByText(productName, { exact: true }).first().isVisible();
  }
}
