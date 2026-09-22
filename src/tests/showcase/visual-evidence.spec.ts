import { expect, test } from '../../fixtures/base.fixture';
import { allure, AllureHelper, Severity } from '../../utils/allure-helper';

// Always record video and trace for this file, regardless of the global settings.
// (Options that start a new browser must be set at file level, not inside describe.)
test.use({ video: { mode: 'on', size: { width: 1366, height: 900 } }, trace: 'on' });

test.describe('Allure feature showcase', { tag: ['@showcase'] }, () => {
  test('Full shopping journey with checkpoints, video and trace', { tag: ['@smoke'] }, async ({ homePage, catalogPage, productPage, cartPage }) => {
    await allure.epic('Allure Showcase');
    await allure.owner('qa-enablement-team');
    await allure.feature('Visual evidence');
    await allure.story('Screenshots, video and trace');
    await allure.severity(Severity.CRITICAL);
    await allure.description(
      'Screenshots are taken at each **checkpoint**; the whole run is recorded as **video** and a **Playwright trace** ' +
        '(download it from the report and open it with `npx playwright show-trace trace.zip` or https://trace.playwright.dev).',
    );

    await homePage.open();
    await AllureHelper.checkpoint(homePage.page, '1 – Home page', { force: true });
    await homePage.goToCatalog();
    await AllureHelper.checkpoint(catalogPage.page, '2 – Catalog', { force: true });
    await catalogPage.openProduct('Grey jacket');
    await AllureHelper.checkpoint(productPage.page, '3 – Product details', { force: true });
    await productPage.addToCart();
    await cartPage.open();
    await AllureHelper.checkpoint(cartPage.page, '4 – Cart', { force: true, fullPage: true });
    await AllureHelper.verify('cart has one line', () => expect(cartPage.lines).toHaveCount(1));
  });
});
