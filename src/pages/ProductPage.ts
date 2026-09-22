import { expect, type Locator } from '@playwright/test';
import { step } from '../utils/allure-helper';
import { parsePrice } from '../utils/test-data';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  protected path = '/collections/all';

  readonly titleHeading: Locator = this.page.locator('#product-form h1[itemprop="name"]');
  readonly price: Locator = this.page.locator('#product-price .product-price');
  readonly addToCartButton: Locator = this.page.locator('#add');
  readonly optionSelects: Locator = this.page.locator('#product-variants select.single-option-selector');
  readonly optionLabels: Locator = this.page.locator('#product-variants label');
  readonly notFoundMessage: Locator = this.page.getByText('Ooops. Sorry, something has gone wrong.');

  @step('Open product page "/products/{0}"')
  async openByHandle(handle: string): Promise<number | undefined> {
    this.path = `/products/${handle}`;
    this.logger.info(`Opening product ${handle}`);
    const response = await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    return response?.status();
  }

  override async waitForReady(): Promise<void> {
    await expect(this.titleHeading, 'Product title should be visible').toBeVisible();
  }

  async getTitle(): Promise<string> {
    return (await this.titleHeading.innerText()).trim();
  }

  async getPrice(): Promise<number> {
    return parsePrice(await this.price.innerText());
  }

  @step('Select option "{0}" = "{1}"')
  async selectOption(optionLabel: string, value: string): Promise<void> {
    const labels = await this.optionLabels.allInnerTexts();
    const index = labels.findIndex((l) => l.trim().toLowerCase() === optionLabel.toLowerCase());
    if (index < 0) throw new Error(`Option "${optionLabel}" not found. Available: ${labels.join(', ')}`);
    await this.optionSelects.nth(index).selectOption(value);
  }

  async getOptionValues(optionIndex: number): Promise<string[]> {
    return this.optionSelects.nth(optionIndex).locator('option').allInnerTexts();
  }

  /** Id of the variant the hidden master <select> currently points to. */
  async selectedVariantId(): Promise<string> {
    return this.page.locator('#product-select').inputValue();
  }

  /**
   * Click "Add To Cart" and wait for Shopify's `/cart/add.js` response so the
   * next step never races the AJAX call.
   */
  @step('Click "Add To Cart"')
  async addToCart(): Promise<void> {
    const title = await this.getTitle();
    this.logger.info(`Adding "${title}" to the cart`);
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/cart/add') && r.request().method() === 'POST'),
      this.addToCartButton.click(),
    ]);
    this.logger.debug(`/cart/add.js answered HTTP ${response.status()}`);
    expect(response.ok(), `Shopify should accept the add-to-cart request (HTTP ${response.status()})`).toBeTruthy();
  }

  /** Click "Add To Cart" without asserting on the backend answer (used by failure scenarios). */
  async clickAddToCart(): Promise<void> {
    await this.addToCartButton.click();
  }
}
