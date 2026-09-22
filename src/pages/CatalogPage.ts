import { expect, type Locator } from '@playwright/test';
import { step } from '../utils/allure-helper';
import { parsePrice } from '../utils/test-data';
import { BasePage } from './BasePage';

export interface ProductCard {
  name: string;
  priceText: string;
  price: number;
  href: string;
  imageAlt: string;
}

/** Product grid used by /collections/all and search results. */
export class CatalogPage extends BasePage {
  protected readonly path: string = '/collections/all';

  readonly productCards: Locator = this.page.locator('.product-grid a[id^="product-"], #content a[id^="product-"]');

  override async waitForReady(): Promise<void> {
    await expect(this.productCards.first(), 'At least one product card should be rendered').toBeVisible();
  }

  @step('Collect all product cards from the grid')
  async getProducts(): Promise<ProductCard[]> {
    const cards = await this.productCards.evaluateAll((els) =>
      els.map((el) => ({
        name: el.querySelector('h3')?.textContent?.trim() ?? '',
        priceText: el.querySelector('h4')?.textContent?.trim() ?? '',
        href: el.getAttribute('href') ?? '',
        imageAlt: el.querySelector('img')?.getAttribute('alt') ?? '',
      })),
    );
    const products = cards.map((c) => ({ ...c, price: c.priceText ? parsePrice(c.priceText) : Number.NaN }));
    this.logger.data('catalog.products', products);
    return products;
  }

  @step('Open product "{0}" from the grid')
  async openProduct(name: string): Promise<void> {
    await Promise.all([
      this.page.waitForURL(/\/products\//),
      this.productCards.filter({ has: this.page.locator('h3', { hasText: name }) }).first().click(),
    ]);
  }
}
