import { expect, type Locator } from '@playwright/test';
import { step } from '../utils/allure-helper';
import { BasePage } from './BasePage';

/**
 * Customer login (/account/login).
 *
 * NOTE: the storefront protects this form with hCaptcha. Automated submissions
 * are intercepted before they reach Shopify, so a submission never shows a
 * "wrong password" message — the user simply stays on the login page. Tests
 * therefore assert that the user is *not* authenticated rather than looking for
 * a specific error text.
 */
export class LoginPage extends BasePage {
  protected readonly path = '/account/login';

  readonly heading: Locator = this.page.getByRole('heading', { name: 'Customer Login' });
  readonly emailInput: Locator = this.page.locator('#customer_email');
  readonly passwordInput: Locator = this.page.locator('#customer_password');
  readonly signInButton: Locator = this.page.locator('#customer_login input[type="submit"]');
  readonly forgotPasswordLink: Locator = this.page.getByRole('link', { name: 'Forgot your password?' });
  readonly recoverEmailInput: Locator = this.page.locator('#recover-email');
  readonly formErrors: Locator = this.page.locator('#customer_login .errors');
  readonly logoutLink: Locator = this.page.getByRole('link', { name: /log ?out/i });

  override async waitForReady(): Promise<void> {
    await expect(this.heading, 'Login heading should be visible').toBeVisible();
  }

  @step('Fill login form with email "{0}"')
  async fillCredentials(email: string, password: string): Promise<void> {
    this.logger.data('login.email', email);
    this.logger.data('login.password', '*'.repeat(password.length));
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  @step('Submit the login form')
  async submit(): Promise<void> {
    await this.signInButton.click();
    // Either a navigation happens or the captcha keeps us on the page.
    await this.page.waitForLoadState('domcontentloaded');
  }

  @step('Log in as "{0}"')
  async login(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await this.submit();
  }

  @step('Open the password recovery form')
  async openPasswordRecovery(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  /** True when the browser is on any login URL. */
  isOnLoginPage(): boolean {
    return /\/account\/login/.test(this.page.url());
  }

  /** Validity of the email input according to the browser's HTML5 rules. */
  async isEmailFieldValid(): Promise<boolean> {
    return this.emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
  }

  async emailValidationMessage(): Promise<string> {
    return this.emailInput.evaluate((el) => (el as HTMLInputElement).validationMessage);
  }
}
