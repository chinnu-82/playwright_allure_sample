# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: showcase/allure-features.spec.ts >> Allure feature showcase >> Result statuses >> FLAKY: fails on the first attempt, passes on retry
- Location: src/tests/showcase/allure-features.spec.ts:273:9

# Error details

```
Error: first attempt loses the simulated race

expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e5]:
        - search:
          - button "Submit" [ref=e6] [cursor=pointer]
          - textbox "Search" [ref=e7]
      - navigation [ref=e9]:
        - link "Search" [ref=e10] [cursor=pointer]:
          - /url: /search
        - link "About Us" [ref=e11] [cursor=pointer]:
          - /url: /pages/about-us
        - link "Log In" [ref=e12] [cursor=pointer]:
          - /url: /account/login
        - link "Sign up" [ref=e13] [cursor=pointer]:
          - /url: /account/register
      - generic [ref=e15]:
        - link "My Cart (0)" [ref=e16] [cursor=pointer]:
          - /url: "#"
        - link "Check Out" [ref=e17] [cursor=pointer]:
          - /url: /cart
    - generic [ref=e20]:
      - heading [level=1] [ref=e22]:
        - link [ref=e23] [cursor=pointer]:
          - /url: /
          - img "Sauce Demo" [ref=e24]
      - heading "Just a demo site showing off what Sauce can do." [level=3] [ref=e27]
  - generic [ref=e28]:
    - navigation [ref=e30]:
      - list [ref=e31]:
        - listitem [ref=e32]:
          - link "Home" [ref=e33] [cursor=pointer]:
            - /url: /
        - listitem [ref=e34]:
          - link "Catalog" [ref=e35] [cursor=pointer]:
            - /url: /collections/all
        - listitem [ref=e36]:
          - link "Blog" [ref=e37] [cursor=pointer]:
            - /url: /blogs/news
        - listitem [ref=e38]:
          - link "About Us" [ref=e39] [cursor=pointer]:
            - /url: /pages/about-us
        - listitem [ref=e40]:
          - link "Wish list" [ref=e41] [cursor=pointer]:
            - /url: "#sauce-show-wish-list"
        - listitem [ref=e42]:
          - link "Refer a friend" [ref=e43] [cursor=pointer]:
            - /url: "#sauce-show-refer-friend"
      - generic [ref=e44]:
        - link [ref=e45] [cursor=pointer]:
          - /url: http://www.facebook.com/shopify
        - link [ref=e46] [cursor=pointer]:
          - /url: http://www.twitter.com/sauce_io
        - link [ref=e47] [cursor=pointer]:
          - /url: http://www.instagram.com/shopify
        - link [ref=e48] [cursor=pointer]:
          - /url: http://www.pinterest.com/chrisjhoughton/awesome-facebook-integration/
        - link [ref=e49] [cursor=pointer]:
          - /url: /blogs/news.atom
    - generic [ref=e52]:
      - link [ref=e54] [cursor=pointer]:
        - /url: /collections/frontpage/products/grey-jacket
        - img "Grey jacket" [ref=e55]
        - heading "Grey jacket" [level=3] [ref=e56]
        - heading "£55.00" [level=4] [ref=e57]
      - link [ref=e59] [cursor=pointer]:
        - /url: /collections/frontpage/products/noir-jacket
        - img "Noir jacket" [ref=e60]
        - heading "Noir jacket" [level=3] [ref=e61]
        - heading "£60.00" [level=4] [ref=e62]
      - link [ref=e64] [cursor=pointer]:
        - /url: /collections/frontpage/products/striped-top
        - img "Striped top" [ref=e65]
        - heading "Striped top" [level=3] [ref=e66]
        - heading "£50.00" [level=4] [ref=e67]
    - contentinfo [ref=e68]:
      - generic [ref=e69]:
        - navigation [ref=e71]:
          - heading "Footer" [level=2] [ref=e72]
          - link "Search" [ref=e73] [cursor=pointer]:
            - /url: /search
          - link "About Us" [ref=e74] [cursor=pointer]:
            - /url: /pages/about-us
        - generic [ref=e76]:
          - heading "About Us" [level=2] [ref=e77]
          - paragraph [ref=e79]:
            - strong [ref=e80]:
              - text: This is a demo site created for
              - link "Sauce" [ref=e81] [cursor=pointer]:
                - /url: http://sauceapp.io
            - text: ", an awesome new way to make your Shopify site social. Sauce allows you to let customers to share what they purchase to their friends, and see what their friends have purchased or \"wanted\" on your store."
        - generic [ref=e83]:
          - img "We accept Amex" [ref=e84]
          - img "We accept Visa" [ref=e85]
          - img "We accept Mastercard" [ref=e86]
      - generic [ref=e87]:
        - generic [ref=e89]:
          - text: Copyright © 2026 Sauce Demo.
          - link "Shopping Cart by Shopify" [ref=e90] [cursor=pointer]:
            - /url: https://www.shopify.co.uk/tour/shopping-cart?utm_campaign=poweredby&utm_medium=shopify&utm_source=onlinestore
          - text: .
        - navigation [ref=e92]:
          - link "Search" [ref=e93] [cursor=pointer]:
            - /url: /search
          - link "About Us" [ref=e94] [cursor=pointer]:
            - /url: /pages/about-us
```

# Test source

```ts
  182 |         await ctx.parameter('load', `${nav.load} ms`);
  183 |         metrics.push({ page: path, ...nav });
  184 |       });
  185 |     }
  186 | 
  187 |     await AllureHelper.attachCsv('page-metrics.csv', metrics);
  188 |     await AllureHelper.attachJson('network-summary-at-end.json', network.summary());
  189 | 
  190 |     for (const m of metrics) {
  191 |       expect.soft(Number(m.load), `${m.page} should finish loading within 15 s`).toBeLessThan(15_000);
  192 |     }
  193 |     await AllureHelper.verify('the cart JSON endpoint answered at least once', () => expect(network.all().length).toBeGreaterThan(0));
  194 |   });
  195 | 
  196 |   // ------------------------------------------------------------------ console
  197 |   test('Browser console capture and analysis', { tag: ['@console'] }, async ({ page, consoleMonitor, logger }) => {
  198 |     await allure.feature('Console & logging');
  199 |     await allure.story('Console capture');
  200 |     await allure.severity(Severity.NORMAL);
  201 | 
  202 |     await page.goto('/');
  203 |     // Emit messages from the page itself so the capture is deterministic.
  204 |     await page.evaluate(() => {
  205 |       console.log('[demo] storefront booted');
  206 |       console.warn('[demo] deprecated API used by a theme script');
  207 |       console.error('[demo] recommendation widget failed to load');
  208 |     });
  209 |     await page.goto('/collections/all');
  210 | 
  211 |     const summary = consoleMonitor.summary();
  212 |     logger.data('console.summary', summary);
  213 |     await AllureHelper.attachJson('console-summary.json', summary);
  214 | 
  215 |     await AllureHelper.verify('the demo error was captured', () =>
  216 |       expect(consoleMonitor.errors().map((e) => e.text)).toContain('[demo] recommendation widget failed to load'),
  217 |     );
  218 |     await AllureHelper.verify('no uncaught JavaScript exceptions on first-party pages', () =>
  219 |       expect(consoleMonitor.getPageErrors().filter((e) => e.pageUrl.startsWith(config.baseURL))).toHaveLength(0),
  220 |     );
  221 |   });
  222 | 
  223 |   // ------------------------------------------------------------------ statuses
  224 |   test.describe('Result statuses', () => {
  225 |     test.beforeEach(async () => {
  226 |       await allure.feature('Test statuses');
  227 |     });
  228 | 
  229 |     test('FAILED: cart total assertion (intentional product defect)', { tag: ['@intentional-failure'] }, async ({ shopApi, cartPage }) => {
  230 |       test.skip(!config.showcaseFailures, 'SHOWCASE_FAILURES=false');
  231 |       await allure.story('Failed');
  232 |       await allure.severity(Severity.BLOCKER);
  233 |       await allure.issue('404');
  234 |       await allure.description('Fails **on purpose**: expects a 10% discount that the store does not apply. Shows the failure message, screenshot, HTML snapshot, video and trace — and both attempts in the **Retries** tab.');
  235 | 
  236 |       const product = await shopApi.getProduct('grey-jacket');
  237 |       await shopApi.addToCart(product.body.variants[0].id, 1);
  238 |       await cartPage.open();
  239 |       const total = await cartPage.getTotal();
  240 | 
  241 |       await AllureHelper.verify('10% loyalty discount is applied to the cart total', () =>
  242 |         expect(total, 'Expected £49.50 after a 10% loyalty discount').toBe(49.5),
  243 |       );
  244 |     });
  245 | 
  246 |     test('BROKEN: test exceeds its timeout (infrastructure problem)', { tag: ['@intentional-failure'] }, async ({ page }) => {
  247 |       test.skip(!config.showcaseFailures, 'SHOWCASE_FAILURES=false');
  248 |       test.setTimeout(8_000);
  249 |       await allure.story('Broken');
  250 |       await allure.severity(Severity.NORMAL);
  251 |       await allure.description('allure-playwright reports a **timed-out** test as **broken** (not failed): the problem is in the test/infra, not in the product.');
  252 | 
  253 |       await page.goto('/');
  254 |       await allure.step('Wait for a widget that never renders', async () => {
  255 |         await page.locator('#loyalty-widget-that-does-not-exist').waitFor({ timeout: 0 });
  256 |       });
  257 |     });
  258 | 
  259 |     test('KNOWN ISSUE: automated sign-in is blocked by hCaptcha', { tag: ['@intentional-failure', '@known-issue'] }, async ({ loginPage }) => {
  260 |       test.skip(!config.showcaseFailures, 'SHOWCASE_FAILURES=false');
  261 |       await allure.story('Failed');
  262 |       await allure.severity(Severity.CRITICAL);
  263 |       await allure.issue('42');
  264 |       await allure.description('Its message matches the "Known issues" rule in `allure-report.config.ts`, so it is grouped in its own **category**.');
  265 | 
  266 |       await loginPage.open();
  267 |       await loginPage.login('demo.customer@example.com', 'CorrectHorseBatteryStaple');
  268 |       await AllureHelper.verify('customer lands on the account page', () =>
  269 |         expect(loginPage.page, 'hCaptcha bot protection prevents automated sign-in').toHaveURL(/\/account$/, { timeout: 5_000 }),
  270 |       );
  271 |     });
  272 | 
  273 |     test('FLAKY: fails on the first attempt, passes on retry', { tag: ['@flaky-demo'] }, async ({ page }, testInfo) => {
  274 |       test.skip(testInfo.project.retries === 0 && config.retries === 0, 'needs RETRIES >= 1');
  275 |       await allure.story('Flaky');
  276 |       await allure.severity(Severity.MINOR);
  277 |       await allure.description('Simulates a race condition. The first attempt fails, the retry passes: Allure shows it as passed with a **flaky** mark and lists every attempt under **Retries**.');
  278 |       await allure.parameter('attempt', String(testInfo.retry + 1), { excluded: true });
  279 | 
  280 |       await page.goto('/');
  281 |       await AllureHelper.verify(`simulated race condition resolved (attempt ${testInfo.retry + 1})`, () =>
> 282 |         expect(testInfo.retry, 'first attempt loses the simulated race').toBeGreaterThan(0),
      |                                                                          ^ Error: first attempt loses the simulated race
  283 |       );
  284 |     });
  285 | 
  286 |     test('SKIPPED: feature toggled off in this environment', async () => {
  287 |       await allure.story('Skipped');
  288 |       await allure.severity(Severity.TRIVIAL);
  289 |       test.skip(true, 'Gift cards are disabled on the demo store');
  290 |     });
  291 | 
  292 |     test('SKIPPED: runs on WebKit only', async ({ browserName }) => {
  293 |       await allure.story('Skipped');
  294 |       await allure.severity(Severity.TRIVIAL);
  295 |       test.skip(browserName !== 'webkit', `Apple Pay button only renders on WebKit (current: ${browserName})`);
  296 |     });
  297 | 
  298 |     test.fixme('FIXME: wishlist sync is not implemented yet', async () => {
  299 |       await allure.story('Skipped');
  300 |     });
  301 | 
  302 |     test('EXPECTED FAILURE: known defect marked with test.fail()', { tag: ['@known-issue'] }, async ({ page }) => {
  303 |       test.fail(true, 'Issue #88: the store has no /pages/shipping page yet');
  304 |       await allure.story('Expected failure');
  305 |       await allure.severity(Severity.MINOR);
  306 |       await allure.issue('88');
  307 |       const response = await page.goto('/pages/shipping');
  308 |       expect(response?.status(), 'shipping information page should exist').toBe(200);
  309 |     });
  310 |   });
  311 | });
  312 | 
```