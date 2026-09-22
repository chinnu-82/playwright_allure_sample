import { expect, type Locator, type Page } from '@playwright/test';
import { config } from '../config';
import { step } from '../utils/allure-helper';
import type { Logger } from '../utils/logger';

/**
 * Behaviour shared by every storefront page: navigation, the header (search,
 * cart counter, account links) and readiness checks.
 */
export abstract class BasePage {
  /** Path relative to baseURL, used by `open()`. */
  protected abstract readonly path: string;

  readonly headerSearchInput: Locator;
  readonly cartCount: Locator;
  readonly loginLink: Locator;
  readonly registerLink: Locator;
  readonly catalogLink: Locator;
  readonly headerCheckoutLink: Locator;

  constructor(
    readonly page: Page,
    protected readonly logger: Logger,
  ) {
    this.headerSearchInput = page.locator('#search-field');
    this.cartCount = page.locator('#cart-target-desktop');
    this.loginLink = page.locator('#customer_login_link').first();
    this.registerLink = page.locator('#customer_register_link').first();
    this.catalogLink = page.getByRole('link', { name: 'Catalog' }).first();
    this.headerCheckoutLink = page.locator('a.checkout');
  }

  @step('Open {class} ({this.path})')
  async open(): Promise<void> {
    this.logger.info(`Navigating to ${config.baseURL}${this.path}`);
    const response = await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    this.logger.debug(`Navigation finished with HTTP ${response?.status()}`, { url: this.page.url() });
    await this.waitForReady();
  }

  /** Override to wait for page-specific content. */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  @step('Read cart counter in header')
  async getCartCount(): Promise<number> {
    const text = (await this.cartCount.innerText()).trim(); // "(2)"
    const count = Number.parseInt(text.replace(/\D/g, ''), 10) || 0;
    this.logger.data('cartCount', count);
    return count;
  }

  @step('Wait until header cart counter shows {0}')
  async expectCartCount(expected: number): Promise<void> {
    await expect(this.cartCount, `Header cart counter should show (${expected})`).toHaveText(`(${expected})`);
  }

  @step('Search for "{0}" from the header')
  async searchFor(term: string): Promise<void> {
    this.logger.info(`Searching for "${term}"`);
    await this.headerSearchInput.fill(term);
    await Promise.all([this.page.waitForURL(/\/search/), this.headerSearchInput.press('Enter')]);
  }

  @step('Go to the catalog')
  async goToCatalog(): Promise<void> {
    await Promise.all([this.page.waitForURL(/\/collections\/all/), this.catalogLink.click()]);
  }

  async title(): Promise<string> {
    return this.page.title();
  }
}
