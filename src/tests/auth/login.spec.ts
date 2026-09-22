import { expect, test } from '../../fixtures/base.fixture';
import { allure, AllureHelper, Severity } from '../../utils/allure-helper';
import { loadJson } from '../../utils/test-data';

interface AuthData {
  invalidCredentials: Array<{ label: string; email: string; password: string }>;
  malformedEmails: string[];
}
const authData = loadJson<AuthData>('auth.json');

test.describe('Customer login', { tag: ['@auth'] }, () => {
  test.beforeEach(async () => {
    await AllureHelper.applyMetadata({
      epic: 'Web Shop',
      feature: 'Authentication',
      owner: 'qa-identity-team',
      layer: 'e2e',
    });
  });

  test('Login page renders every element a customer needs to sign in', { tag: ['@smoke'] }, async ({ loginPage }) => {
    await AllureHelper.applyMetadata({
      story: 'Login form',
      severity: Severity.CRITICAL,
      tms: ['1001'],
      description: [
        'Verifies the **customer login** page is reachable and complete.',
        '',
        '| Element | Expectation |',
        '|---|---|',
        '| Email field | visible, `type=email` |',
        '| Password field | visible, masked |',
        '| Sign In button | enabled |',
        '| Forgot password link | visible |',
      ].join('\n'),
    });

    await loginPage.open();

    await AllureHelper.verify('email field is visible and typed as email', async () => {
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.emailInput).toHaveAttribute('type', 'email');
    });
    await AllureHelper.verify('password field masks its input', async () => {
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });
    await AllureHelper.verify('"Sign In" button is enabled', async () => {
      await expect(loginPage.signInButton).toBeEnabled();
    });
    await AllureHelper.verify('"Forgot your password?" link is offered', async () => {
      await expect(loginPage.forgotPasswordLink).toBeVisible();
    });
    await AllureHelper.checkpoint(loginPage.page, 'Login page');
  });

  for (const cred of authData.invalidCredentials) {
    test(`Invalid credentials do not authenticate the user (${cred.label})`, { tag: ['@regression', '@negative'] }, async ({ loginPage, network }) => {
      await AllureHelper.applyMetadata({
        story: 'Reject invalid credentials',
        severity: Severity.BLOCKER,
        issues: ['42'],
        description:
          'Submitting wrong credentials must never create a session. The storefront shields the form with ' +
          '**hCaptcha**, so the expected outcome is: the customer stays on the login page and no "Log out" link appears.',
      });
      await allure.parameter('email', cred.email);
      await AllureHelper.secretParameter('password', cred.password);

      await loginPage.open();
      await loginPage.login(cred.email, cred.password);

      await AllureHelper.verify('customer is still on the login page', async () => {
        await expect(loginPage.page).toHaveURL(/\/account\/login/);
      });
      await AllureHelper.verify('no authenticated-only "Log out" link is shown', async () => {
        await expect(loginPage.logoutLink).toHaveCount(0);
      });
      await AllureHelper.step('Record whether bot protection intervened', async () => {
        const captchaTraffic = network.find(/hcaptcha/).length;
        await AllureHelper.logStep(`hCaptcha requests observed: ${captchaTraffic}`);
      });
      await AllureHelper.checkpoint(loginPage.page, 'After invalid login attempt');
    });
  }

  test('Submitting an empty form keeps the customer signed out', { tag: ['@regression', '@negative'] }, async ({ loginPage }) => {
    await AllureHelper.applyMetadata({ story: 'Reject invalid credentials', severity: Severity.NORMAL });

    await loginPage.open();
    await loginPage.submit();

    await AllureHelper.verify('customer remains on the login page', async () => {
      await expect(loginPage.page).toHaveURL(/\/account\/login/);
    });
    await AllureHelper.verify('email field is still empty and editable', async () => {
      await expect(loginPage.emailInput).toHaveValue('');
      await expect(loginPage.emailInput).toBeEditable();
    });
  });

  for (const email of authData.malformedEmails) {
    test(`Browser validation flags malformed email "${email}"`, { tag: ['@regression', '@validation'] }, async ({ loginPage }) => {
      await AllureHelper.applyMetadata({ story: 'Client-side validation', severity: Severity.MINOR });
      await allure.parameter('malformed email', email);

      await loginPage.open();
      await loginPage.emailInput.fill(email);

      const valid = await loginPage.isEmailFieldValid();
      const message = await loginPage.emailValidationMessage();
      await allure.step(`Browser validation message: "${message}"`, () => undefined);

      await AllureHelper.verify(`"${email}" is rejected by the email input`, () => {
        expect(valid, `HTML5 validation should reject "${email}"`).toBe(false);
      });
    });
  }

  test('"Forgot your password?" swaps the login form for the recovery form', { tag: ['@regression'] }, async ({ loginPage }) => {
    await AllureHelper.applyMetadata({ story: 'Password recovery', severity: Severity.MINOR });

    await loginPage.open();
    await loginPage.openPasswordRecovery();

    await AllureHelper.verify('recovery email field becomes visible', async () => {
      await expect(loginPage.recoverEmailInput).toBeVisible();
    });
    await AllureHelper.verify('login email field is hidden', async () => {
      await expect(loginPage.emailInput).toBeHidden();
    });
    await AllureHelper.checkpoint(loginPage.page, 'Password recovery form');
  });
});
