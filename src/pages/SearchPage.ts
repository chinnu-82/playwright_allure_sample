import { expect, type Locator } from '@playwright/test';
import { step } from '../utils/allure-helper';
import { CatalogPage } from './CatalogPage';

export class SearchPage extends CatalogPage {
  protected override readonly path: string = '/search';

  readonly heading: Locator = this.page.getByRole('heading', { name: 'Search Results' });
  readonly noResultsMessage: Locator = this.page.getByText(/No results found for/i);

  override async waitForReady(): Promise<void> {
    await expect(this.page, 'Browser should be on the search results page').toHaveURL(/\/search/);
  }

  @step('Open search results for "{0}"')
  async openFor(term: string): Promise<void> {
    this.logger.info(`Opening search results for "${term}"`);
    await this.page.goto(`/search?q=${encodeURIComponent(term)}&type=product`, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  async resultNames(): Promise<string[]> {
    return (await this.getProducts()).map((p) => p.name);
  }
}
