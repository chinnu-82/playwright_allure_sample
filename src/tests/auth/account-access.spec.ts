import { expect, test } from '../../fixtures/base.fixture';
import { AllureHelper, Severity } from '../../utils/allure-helper';

test.describe('Account access', { tag: ['@auth'] }, () => {
  test.beforeEach(async () => {
    await AllureHelper.applyMetadata({ epic: 'Web Shop', feature: 'Authentication', owner: 'qa-identity-team', layer: 'e2e' });
  });

  test('Anonymous visitors are redirected from /account to the login page', { tag: ['@smoke', '@security'] }, async ({ page, loginPage }) => {
    await AllureHelper.applyMetadata({
      story: 'Protect customer area',
      severity: Severity.BLOCKER,
      description: 'The customer area must never render for anonymous users. Shopify redirects to login and keeps a `return_url`.',
    });

    await page.goto('/account');

    await AllureHelper.verify('browser is redirected to /account/login', () => expect(page).toHaveURL(/\/account\/login/));
    await AllureHelper.verify('return_url points back to /account', () => expect(page).toHaveURL(/return_url=%2Faccount/));
    await AllureHelper.verify('login form is displayed', () => expect(loginPage.heading).toBeVisible());
  });

  test('Header "Sign up" link opens the registration form', { tag: ['@regression'] }, async ({ homePage, registerPage }) => {
    await AllureHelper.applyMetadata({ story: 'Registration', severity: Severity.NORMAL });

    await homePage.open();
    await AllureHelper.step('Click "Sign up" in the header', async () => {
      await Promise.all([homePage.page.waitForURL(/\/account\/register/), homePage.registerLink.click()]);
    });
    await registerPage.waitForReady();

    for (const [label, field] of [
      ['First name', registerPage.firstName],
      ['Last name', registerPage.lastName],
      ['Email', registerPage.email],
      ['Password', registerPage.password],
    ] as const) {
      await AllureHelper.verify(`"${label}" field is visible`, () => expect(field).toBeVisible());
    }
    await AllureHelper.checkpoint(registerPage.page, 'Registration form');
  });
});
