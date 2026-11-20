# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products/search.spec.ts >> Product search >> Nonsense search term shows a "no results" message
- Location: src/tests/products/search.spec.ts:32:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/No results found for/i)
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/No results found for/i) with timeout 10000ms
  - waiting for getByText(/No results found for/i)

```

```yaml
- banner:
  - search:
    - button "Submit"
    - textbox "Search"
  - navigation:
    - link "Search":
      - /url: /search
    - link "About Us":
      - /url: /pages/about-us
    - link "Log In":
      - /url: /account/login
    - link "Sign up":
      - /url: /account/register
  - link "My Cart (0)":
    - /url: "#"
  - link "Check Out":
    - /url: /cart
  - heading "Sauce Demo" [level=1]:
    - link "Sauce Demo":
      - /url: /
      - img "Sauce Demo"
  - heading "Just a demo site showing off what Sauce can do." [level=3]
- navigation:
  - list:
    - listitem:
      - link "Home":
        - /url: /
    - listitem:
      - link "Catalog":
        - /url: /collections/all
    - listitem:
      - link "Blog":
        - /url: /blogs/news
    - listitem:
      - link "About Us":
        - /url: /pages/about-us
    - listitem:
      - link "Wish list":
        - /url: "#sauce-show-wish-list"
    - listitem:
      - link "Refer a friend":
        - /url: "#sauce-show-refer-friend"
  - link:
    - /url: http://www.facebook.com/shopify
  - link:
    - /url: http://www.twitter.com/sauce_io
  - link:
    - /url: http://www.instagram.com/shopify
  - link:
    - /url: http://www.pinterest.com/chrisjhoughton/awesome-facebook-integration/
  - link:
    - /url: /blogs/news.atom
- link "Home":
  - /url: /
- text: —
- link "Search":
  - /url: /search
- heading "Search Results" [level=1]
- text: Showing results for zzqx-no-such-product
- link "Bronze sandals Bronze sandals £39.99":
  - /url: /products/bronze-sandals?_pos=1&_sid=1a7814dc3&_ss=r
  - img "Bronze sandals"
  - heading "Bronze sandals" [level=3]
  - heading "£39.99" [level=4]
- link "Noir jacket Noir jacket £60.00":
  - /url: /products/noir-jacket?_pos=2&_sid=1a7814dc3&_ss=r
  - img "Noir jacket"
  - heading "Noir jacket" [level=3]
  - heading "£60.00" [level=4]
- link "Black heels Black heels £45.00":
  - /url: /products/flower-print-jeans?_pos=3&_sid=1a7814dc3&_ss=r
  - img "Black heels"
  - heading "Black heels" [level=3]
  - heading "£45.00" [level=4]
- link "Striped top Striped top £50.00":
  - /url: /products/striped-top?_pos=4&_sid=1a7814dc3&_ss=r
  - img "Striped top"
  - heading "Striped top" [level=3]
  - heading "£50.00" [level=4]
- link "Sold Out Brown Shades Brown Shades £20.00":
  - /url: /products/brown-shades?_pos=5&_sid=1a7814dc3&_ss=r
  - text: Sold Out
  - img "Brown Shades"
  - heading "Brown Shades" [level=3]
  - heading "£20.00" [level=4]
- contentinfo:
  - navigation:
    - heading "Footer" [level=2]
    - link "Search":
      - /url: /search
    - link "About Us":
      - /url: /pages/about-us
  - heading "About Us" [level=2]
  - paragraph:
    - strong:
      - text: This is a demo site created for
      - link "Sauce":
        - /url: http://sauceapp.io
    - text: ", an awesome new way to make your Shopify site social. Sauce allows you to let customers to share what they purchase to their friends, and see what their friends have purchased or \"wanted\" on your store."
  - img "We accept Amex"
  - img "We accept Visa"
  - img "We accept Mastercard"
  - text: Copyright © 2026 Sauce Demo.
  - link "Shopping Cart by Shopify":
    - /url: https://www.shopify.co.uk/tour/shopping-cart?utm_campaign=poweredby&utm_medium=shopify&utm_source=onlinestore
  - text: .
  - navigation:
    - link "Search":
      - /url: /search
    - link "About Us":
      - /url: /pages/about-us
```

# Test source

```ts
  1  | import { expect, test } from '../../fixtures/base.fixture';
  2  | import { allure, AllureHelper, Severity } from '../../utils/allure-helper';
  3  | import { loadJson } from '../../utils/test-data';
  4  | 
  5  | const terms = loadJson<Array<{ term: string; mustInclude: string[] }>>('search-terms.json');
  6  | 
  7  | test.describe('Product search', { tag: ['@products', '@search'] }, () => {
  8  |   test.beforeEach(async () => {
  9  |     await AllureHelper.applyMetadata({ epic: 'Web Shop', feature: 'Product Search', owner: 'qa-merchandising-team', layer: 'e2e' });
  10 |   });
  11 | 
  12 |   for (const { term, mustInclude } of terms) {
  13 |     test(`Searching "${term}" returns the matching products`, { tag: ['@regression'] }, async ({ homePage, searchPage }) => {
  14 |       await AllureHelper.applyMetadata({
  15 |         story: 'Search by keyword',
  16 |         severity: Severity.NORMAL,
  17 |         parameters: { term, 'expected products': mustInclude.join(', ') },
  18 |       });
  19 | 
  20 |       await homePage.open();
  21 |       await homePage.searchFor(term);
  22 |       const names = await searchPage.resultNames();
  23 |       await allure.parameter('result count', String(names.length), { excluded: true });
  24 | 
  25 |       for (const expected of mustInclude) {
  26 |         await AllureHelper.verify(`results contain "${expected}"`, () => expect(names).toContain(expected));
  27 |       }
  28 |       await AllureHelper.checkpoint(searchPage.page, `Results for "${term}"`);
  29 |     });
  30 |   }
  31 | 
  32 |   test('Nonsense search term shows a "no results" message', { tag: ['@regression', '@negative'] }, async ({ searchPage }) => {
  33 |     const term = 'zzqx-no-such-product';
  34 |     await AllureHelper.applyMetadata({ story: 'Search by keyword', severity: Severity.MINOR, parameters: { term } });
  35 | 
  36 |     await searchPage.openFor(term);
  37 | 
> 38 |     await AllureHelper.verify('"No results found" message is shown', () => expect(searchPage.noResultsMessage).toBeVisible());
     |                                                                                                                ^ Error: expect(locator).toBeVisible() failed
  39 |     await AllureHelper.verify('no product cards are rendered', () => expect(searchPage.productCards).toHaveCount(0));
  40 |   });
  41 | });
  42 | 
```