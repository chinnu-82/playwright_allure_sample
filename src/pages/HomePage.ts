import { expect, type Locator } from '@playwright/test';
import { step } from '../utils/allure-helper';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  protected readonly path = '/';

  get logo(): Locator {
    return this.page.locator('#logo');
  }

  get featuredProducts(): Locator {
    return this.page.locator('a[id^="product-"]');
  }

  override async waitForReady(): Promise<void> {
    await expect(this.logo, 'Store logo should be visible on the home page').toBeVisible();
  }

  @step('Open featured product "{0}"')
  async openFeaturedProduct(name: string): Promise<void> {
    await this.featuredProducts.filter({ hasText: name }).first().click();
    await this.page.waitForURL(/\/products\//);
  }
}
