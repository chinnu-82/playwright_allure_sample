import { expect, test } from '../../fixtures/base.fixture';
import { allure, AllureHelper, Severity } from '../../utils/allure-helper';
import { loadJson } from '../../utils/test-data';

const terms = loadJson<Array<{ term: string; mustInclude: string[] }>>('search-terms.json');

test.describe('Product search', { tag: ['@products', '@search'] }, () => {
  test.beforeEach(async () => {
    await AllureHelper.applyMetadata({ epic: 'Web Shop', feature: 'Product Search', owner: 'qa-merchandising-team', layer: 'e2e' });
  });

  for (const { term, mustInclude } of terms) {
    test(`Searching "${term}" returns the matching products`, { tag: ['@regression'] }, async ({ homePage, searchPage }) => {
      await AllureHelper.applyMetadata({
        story: 'Search by keyword',
        severity: Severity.NORMAL,
        parameters: { term, 'expected products': mustInclude.join(', ') },
      });

      await homePage.open();
      await homePage.searchFor(term);
      const names = await searchPage.resultNames();
      await allure.parameter('result count', String(names.length), { excluded: true });

      for (const expected of mustInclude) {
        await AllureHelper.verify(`results contain "${expected}"`, () => expect(names).toContain(expected));
      }
      await AllureHelper.checkpoint(searchPage.page, `Results for "${term}"`);
    });
  }

  test('Nonsense search term shows a "no results" message', { tag: ['@regression', '@negative'] }, async ({ searchPage }) => {
    const term = 'zzqx-no-such-product';
    await AllureHelper.applyMetadata({ story: 'Search by keyword', severity: Severity.MINOR, parameters: { term } });

    await searchPage.openFor(term);

    await AllureHelper.verify('"No results found" message is shown', () => expect(searchPage.noResultsMessage).toBeVisible());
    await AllureHelper.verify('no product cards are rendered', () => expect(searchPage.productCards).toHaveCount(0));
  });
});
