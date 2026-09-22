import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  protected readonly path = '/account/register';

  readonly heading: Locator = this.page.getByRole('heading', { name: 'Create Account' });
  readonly form: Locator = this.page.locator('form#create_customer');
  // The theme reuses each id on a wrapper <div> and its <input>, hence the input# prefix.
  readonly firstName: Locator = this.form.locator('input#first_name');
  readonly lastName: Locator = this.form.locator('input#last_name');
  readonly email: Locator = this.form.locator('input#email');
  readonly password: Locator = this.form.locator('input#password');
  readonly submitButton: Locator = this.form.locator('input[type="submit"]');

  override async waitForReady(): Promise<void> {
    await expect(this.heading, 'Registration heading should be visible').toBeVisible();
  }
}
