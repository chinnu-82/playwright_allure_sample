import { expect, type Locator } from '@playwright/test';
import { step } from '../utils/allure-helper';
import { parsePrice } from '../utils/test-data';
import { BasePage } from './BasePage';

export interface CartLine {
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export class CartPage extends BasePage {
  protected readonly path = '/cart';

  readonly cartSection: Locator = this.page.locator('section#cart');
  readonly lines: Locator = this.cartSection.locator('form .row:has(input[name="updates[]"])');
  readonly total: Locator = this.cartSection.locator('.cart.total h2');
  readonly emptyMessage: Locator = this.cartSection.getByText('It appears that your cart is currently empty!');
  readonly updateButton: Locator = this.cartSection.locator('#update');
  readonly checkoutButton: Locator = this.cartSection.locator('#checkout');
  readonly noteInput: Locator = this.cartSection.locator('#note');
  readonly continueShopping: Locator = this.cartSection.getByRole('link', { name: /Continue Shopping/ });

  override async waitForReady(): Promise<void> {
    await expect(this.page, 'Browser should be on the cart page').toHaveURL(/\/cart/);
  }

  @step('Read cart lines')
  async getLines(): Promise<CartLine[]> {
    const raw = await this.lines.evaluateAll((rows) =>
      rows.map((row) => ({
        name: row.querySelector('.info h3')?.textContent?.trim() ?? '',
        price: row.querySelector('.price')?.textContent?.trim() ?? '0',
        qty: (row.querySelector('input[name="updates[]"]') as HTMLInputElement | null)?.value ?? '0',
        total: row.querySelector('.total')?.textContent?.trim() ?? '0',
      })),
    );
    const lines = raw.map((r) => ({
      name: r.name,
      unitPrice: parsePrice(r.price),
      quantity: Number.parseInt(r.qty, 10),
      lineTotal: parsePrice(r.total),
    }));
    this.logger.data('cart.lines', lines);
    return lines;
  }

  @step('Read cart total')
  async getTotal(): Promise<number> {
    const total = parsePrice(await this.total.innerText());
    this.logger.data('cart.total', total);
    return total;
  }

  @step('Set quantity of line {0} to {1} and update the cart')
  async setQuantity(lineIndex: number, quantity: number): Promise<void> {
    await this.lines.nth(lineIndex).locator('input[name="updates[]"]').fill(String(quantity));
    await Promise.all([this.page.waitForLoadState('domcontentloaded'), this.updateButton.click()]);
    await this.page.waitForURL(/\/cart/);
  }

  @step('Remove line {0} from the cart')
  async removeLine(lineIndex: number): Promise<void> {
    await this.lines.nth(lineIndex).locator('.remove a').click();
    await this.page.waitForURL(/\/cart/);
    await this.page.waitForLoadState('domcontentloaded');
  }

  @step('Click "Check Out"')
  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await this.page.waitForURL(/\/checkouts\//, { timeout: 60_000 });
  }
}
