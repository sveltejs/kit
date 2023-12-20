import { expect } from '@playwright/test';
import { test } from '../../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('a11y', () => {
	test('resets focus', async ({ page, clicknav, browserName }) => {
		const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';

		await page.goto('/accessibility/a');

		await clicknav('[href="/accessibility/b"]');
		expect(await page.innerHTML('h1')).toBe('b');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BODY');
		await page.keyboard.press(tab);

		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BUTTON');
		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toBe('focus me');

		await clicknav('[href="/accessibility/a"]');
		expect(await page.innerHTML('h1')).toBe('a');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BODY');

		await page.keyboard.press(tab);
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BUTTON');
		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toBe('focus me');

		expect(await page.evaluate(() => document.documentElement.getAttribute('tabindex'))).toBe(null);
	});

	test('applies autofocus after a navigation', async ({ page, clicknav }) => {
		await page.goto('/accessibility/autofocus/a');

		await clicknav('[href="/accessibility/autofocus/b"]');
		expect(await page.innerHTML('h1')).toBe('b');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('INPUT');
	});

	test('announces client-side navigation', async ({ page, clicknav, javaScriptEnabled }) => {
		await page.goto('/accessibility/a');

		const has_live_region = (await page.innerHTML('body')).includes('aria-live');

		if (javaScriptEnabled) {
			expect(has_live_region).toBeTruthy();

			// live region should exist, but be empty
			expect(await page.innerHTML('[aria-live]')).toBe('');

			await clicknav('[href="/accessibility/b"]');
			expect(await page.innerHTML('[aria-live]')).toBe('b'); // TODO i18n
		} else {
			expect(has_live_region).toBeFalsy();
		}
	});

	test('reset selection', async ({ page, clicknav }) => {
		await page.goto('/selection/a');

		expect(
			await page.evaluate(() => {
				const range = document.createRange();
				range.selectNodeContents(document.body);
				const selection = getSelection();
				if (selection) {
					selection.removeAllRanges();
					selection.addRange(range);
					return selection.rangeCount;
				}
				return -1;
			})
		).toBe(1);

		await clicknav('[href="/selection/b"]');
		expect(
			await page.evaluate(() => {
				const selection = getSelection();
				if (selection) {
					return selection.rangeCount;
				}
				return -1;
			})
		).toBe(0);
	});

	test('keepfocus works', async ({ page }) => {
		await page.goto('/keepfocus');

		await Promise.all([
			page.type('#input', 'bar'),
			page.waitForFunction(() => window.location.search === '?foo=bar')
		]);
		await expect(page.locator('#input')).toBeFocused();
	});

	test('autofocus from previous page is ignored', async ({ page, clicknav }) => {
		page.addInitScript(`
			window.active = null;
			window.addEventListener('focusin', () => window.active = document.activeElement);
		`);

		await page.goto('/accessibility/autofocus/a');
		await clicknav('[href="/"]');

		expect(await page.evaluate(() => (window.active || {}).nodeName)).toBe('BODY');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BODY');
	});
});

test.describe('Navigation lifecycle functions', () => {
	test('beforeNavigate prevents navigation triggered by link click', async ({ page, baseURL }) => {
		await page.goto('/navigation-lifecycle/before-navigate/prevent-navigation');

		await page.click('[href="/navigation-lifecycle/before-navigate/a"]');
		await page.waitForLoadState('networkidle');

		expect(page.url()).toBe(baseURL + '/navigation-lifecycle/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('1 false link');
	});

	test('beforeNavigate prevents navigation to external', async ({ page, baseURL }) => {
		await page.goto('/navigation-lifecycle/before-navigate/prevent-navigation');
		await page.click('h1'); // The browsers block attempts to prevent navigation on a frame that's never had a user gesture.

		page.on('dialog', (dialog) => dialog.dismiss());

		page.click('a[href="https://google.de"]'); // do NOT await this, promise only resolves after successful navigation, which never happens
		await page.waitForTimeout(500);
		await expect(page.locator('pre')).toHaveText('1 true link');
		expect(page.url()).toBe(baseURL + '/navigation-lifecycle/before-navigate/prevent-navigation');
	});

	test('beforeNavigate prevents navigation triggered by goto', async ({ page, app, baseURL }) => {
		await page.goto('/navigation-lifecycle/before-navigate/prevent-navigation');
		await app.goto('/navigation-lifecycle/before-navigate/a');
		expect(page.url()).toBe(baseURL + '/navigation-lifecycle/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('1 false goto');
	});

	test('beforeNavigate prevents navigation triggered by back button', async ({
		page,
		app,
		baseURL
	}) => {
		await page.goto('/navigation-lifecycle/before-navigate/a');
		await app.goto('/navigation-lifecycle/before-navigate/prevent-navigation');
		await page.click('h1'); // The browsers block attempts to prevent navigation on a frame that's never had a user gesture.

		await page.goBack();
		expect(await page.innerHTML('pre')).toBe('1 false popstate');
		expect(page.url()).toBe(baseURL + '/navigation-lifecycle/before-navigate/prevent-navigation');
	});

	test('beforeNavigate prevents unload', async ({ page }) => {
		await page.goto('/navigation-lifecycle/before-navigate/prevent-navigation');
		await page.click('h1'); // The browsers block attempts to prevent navigation on a frame that's never had a user gesture.
		const type = new Promise((fulfil) => {
			page.on('dialog', async (dialog) => {
				fulfil(dialog.type());
				await dialog.dismiss();
			});
		});

		await page.close({ runBeforeUnload: true });
		expect(await type).toBe('beforeunload');
		expect(await page.innerHTML('pre')).toBe('1 true leave');
	});

	test('beforeNavigate is not triggered on redirect', async ({ page, baseURL }) => {
		await page.goto('/navigation-lifecycle/before-navigate/prevent-navigation');

		await page.click('[href="/navigation-lifecycle/before-navigate/redirect"]');
		await page.waitForLoadState('networkidle');

		expect(page.url()).toBe(baseURL + '/navigation-lifecycle/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('1 false link');
	});

	test('beforeNavigate is not triggered on target=_blank', async ({ page, baseURL }) => {
		await page.goto('/navigation-lifecycle/before-navigate/prevent-navigation');

		await page.click('a[href="https://google.com"]');
		await page.waitForTimeout(500);

		expect(page.url()).toBe(baseURL + '/navigation-lifecycle/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('0 false undefined');
	});

	test('beforeNavigate is not triggered on click or popstate for hash links', async ({ page }) => {
		await page.goto('/navigation-lifecycle/before-navigate/hash-links');

		await page.click('a[href="#x"]');
		await page.goBack();
		expect(await page.textContent('h1')).toBe('before_navigate_ran: false');
	});

	test('beforeNavigate cancel() on an unloading navigation does not prevent subsequent beforeNavigate callbacks', async ({
		page,
		app
	}) => {
		await page.goto('/navigation-lifecycle/before-navigate/prevent-navigation');
		await page.click('h1'); // The browsers block attempts to prevent navigation on a frame that's never had a user gesture.
		page.on('dialog', async (dialog) => {
			await dialog.dismiss();
		});
		await page.close({ runBeforeUnload: true });
		await page.waitForTimeout(100);
		await app.goto('/navigation-lifecycle/before-navigate/prevent-navigation?x=1');

		expect(await page.innerHTML('pre')).toBe('2 false goto');
	});

	test('beforeNavigate is triggered after clicking a download link', async ({ page, baseURL }) => {
		await page.goto('/navigation-lifecycle/before-navigate/prevent-navigation');

		await page.click('a[download]');
		expect(await page.innerHTML('pre')).toBe('0 false undefined');

		await page.click('a[href="/navigation-lifecycle/before-navigate/a"]');

		expect(page.url()).toBe(baseURL + '/navigation-lifecycle/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('1 false link');
	});

	test('afterNavigate calls callback', async ({ page, clicknav }) => {
		await page.goto('/navigation-lifecycle/after-navigate/a');
		expect(await page.textContent('h1')).toBe(
			'undefined -> /navigation-lifecycle/after-navigate/a'
		);

		await clicknav('[href="/navigation-lifecycle/after-navigate/b"]');
		expect(await page.textContent('h1')).toBe(
			'/navigation-lifecycle/after-navigate/a -> /navigation-lifecycle/after-navigate/b'
		);
	});

	test('onNavigate calls callback', async ({ page, clicknav }) => {
		await page.goto('/navigation-lifecycle/on-navigate/a');
		expect(await page.textContent('h1')).toBe('undefined -> undefined (...)');

		await clicknav('[href="/navigation-lifecycle/on-navigate/b"]');
		expect(await page.textContent('h1')).toBe(
			'/navigation-lifecycle/on-navigate/a -> /navigation-lifecycle/on-navigate/b (link)'
		);
	});
});

test.describe('Scrolling', () => {
	test('url-supplied anchor works on direct page load', async ({ page, in_view }) => {
		await page.goto('/anchor/anchor#go-to-element');
		expect(await in_view('#go-to-element')).toBe(true);
	});

	test('url-supplied anchor works on navigation to page', async ({ page, in_view, clicknav }) => {
		await page.goto('/anchor');
		await clicknav('#first-anchor');
		expect(await in_view('#go-to-element')).toBe(true);
	});

	test('url-supplied non-ascii anchor works on navigation to page', async ({
		page,
		in_view,
		clicknav
	}) => {
		await page.goto('/anchor');
		await clicknav('#non-ascii-anchor');
		expect(await in_view('#go-to-encöded')).toBe(true);
	});

	test('url-supplied anchor with special characters works on navigation to page', async ({
		page,
		in_view,
		clicknav
	}) => {
		await page.goto('/anchor');
		await clicknav('#special-char-anchor');
		expect(await in_view('.special-char-id')).toBe(true);
	});

	test('url-supplied anchor works when navigated from scrolled page', async ({
		page,
		clicknav,
		in_view
	}) => {
		await page.goto('/anchor');
		await clicknav('#second-anchor');
		expect(await in_view('#go-to-element')).toBe(true);
	});

	test('no-anchor url will scroll to top when navigated from scrolled page', async ({
		page,
		clicknav
	}) => {
		await page.goto('/anchor');
		await clicknav('#third-anchor');
		expect(await page.evaluate(() => scrollY)).toBe(0);
	});

	test('url-supplied anchor works when navigated from bottom of page', async ({
		page,
		clicknav,
		in_view
	}) => {
		await page.goto('/anchor');
		await clicknav('#last-anchor');
		expect(await in_view('#go-to-element')).toBe(true);
	});

	test('no-anchor url will scroll to top when navigated from bottom of page', async ({
		clicknav,
		page
	}) => {
		await page.goto('/anchor');
		await clicknav('#last-anchor-2');
		expect(await page.evaluate(() => scrollY)).toBe(0);
	});

	test('scroll is restored after hitting the back button', async ({ baseURL, clicknav, page }) => {
		await page.goto('/anchor');
		await page.locator('#scroll-anchor').click();
		const originalScrollY = /** @type {number} */ (await page.evaluate(() => scrollY));
		await clicknav('#routing-page');
		await page.goBack();
		await page.waitForLoadState('networkidle');
		expect(page.url()).toBe(baseURL + '/anchor#last-anchor-2');
		expect(await page.evaluate(() => scrollY)).toEqual(originalScrollY);

		await page.goBack();
		await page.waitForLoadState('networkidle');

		expect(page.url()).toBe(baseURL + '/anchor');
		expect(await page.evaluate(() => scrollY)).toEqual(0);
	});

	test('scroll is restored after hitting the back button for an in-app cross-document navigation', async ({
		page,
		clicknav
	}) => {
		await page.goto('/scroll/cross-document/a');

		const rect = await page.locator('[href="/scroll/cross-document/b"]').boundingBox();
		const height = await page.evaluate(() => innerHeight);
		if (!rect) throw new Error('Could not determine bounding box');

		const target_scroll_y = rect.y + rect.height - height;
		await page.evaluate((y) => scrollTo(0, y), target_scroll_y);

		await page.locator('[href="/scroll/cross-document/b"]').click();
		expect(await page.textContent('h1')).toBe('b');
		await page.waitForSelector('body.started');

		await clicknav('[href="/scroll/cross-document/c"]');
		expect(await page.textContent('h1')).toBe('c');

		await page.goBack(); // client-side back
		await page.goBack(); // native back
		expect(await page.textContent('h1')).toBe('a');
		await page.waitForSelector('body.started');

		await page.waitForTimeout(250); // needed for the test to fail reliably without the fix

		const scroll_y = await page.evaluate(() => scrollY);

		expect(Math.abs(scroll_y - target_scroll_y)).toBeLessThan(50); // we need a few pixels wiggle room, because browsers
	});

	test('url-supplied anchor is ignored with onMount() scrolling on direct page load', async ({
		page,
		in_view
	}) => {
		await page.goto('/anchor-with-manual-scroll/anchor-onmount#go-to-element');
		expect(await in_view('#abcde')).toBe(true);
	});

	test('url-supplied anchor is ignored with afterNavigate() scrolling on direct page load', async ({
		page,
		in_view,
		clicknav
	}) => {
		await page.goto('/anchor-with-manual-scroll/anchor-afternavigate#go-to-element');
		expect(await in_view('#abcde')).toBe(true);

		await clicknav('[href="/anchor-with-manual-scroll/anchor-afternavigate?x=y#go-to-element"]');
		expect(await in_view('#abcde')).toBe(true);
	});

	test('url-supplied anchor is ignored with onMount() scrolling on navigation to page', async ({
		page,
		clicknav,
		javaScriptEnabled,
		in_view
	}) => {
		await page.goto('/anchor-with-manual-scroll');
		await clicknav('[href="/anchor-with-manual-scroll/anchor-onmount#go-to-element"]');
		if (javaScriptEnabled) expect(await in_view('#abcde')).toBe(true);
		else expect(await in_view('#go-to-element')).toBe(true);
	});

	test('app-supplied scroll and focus work on direct page load', async ({ page, in_view }) => {
		await page.goto('/use-action/focus-and-scroll');
		expect(await in_view('#input')).toBe(true);
		await expect(page.locator('#input')).toBeFocused();
	});

	test('app-supplied scroll and focus work on navigation to page', async ({
		page,
		clicknav,
		in_view
	}) => {
		await page.goto('/use-action');
		await clicknav('[href="/use-action/focus-and-scroll"]');
		expect(await in_view('#input')).toBe(true);
		await expect(page.locator('input')).toBeFocused();
	});

	test('scroll positions are recovered on reloading the page', async ({ page, app }) => {
		await page.goto('/anchor');
		await page.evaluate(() => window.scrollTo(0, 1000));
		await app.goto('/anchor/anchor');
		await page.evaluate(() => window.scrollTo(0, 1000));

		await page.reload();
		expect(await page.evaluate(() => window.scrollY)).toBe(1000);

		await page.goBack();
		expect(await page.evaluate(() => window.scrollY)).toBe(1000);
	});

	test('scroll position is top of page on ssr:false reload', async ({ page }) => {
		await page.goto('/no-ssr/margin');
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
		await page.reload();
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
	});
});

test.describe('CSS', () => {
	test('applies generated component styles (hides announcer)', async ({
		page,
		clicknav,
		get_computed_style
	}) => {
		await page.goto('/css');
		await clicknav('[href="/css/other"]');

		expect(await get_computed_style('#svelte-announcer', 'position')).toBe('absolute');
	});
});

test.describe.serial('Errors', () => {
	test('client-side load errors', async ({ page }) => {
		await page.goto('/errors/load-client');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Crashing now (500 Internal Error)"'
		);
	});

	test('client-side module context errors', async ({ page }) => {
		await page.goto('/errors/module-scope-client');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Crashing now (500 Internal Error)"'
		);
	});

	test('client-side error from load()', async ({ page }) => {
		await page.goto('/errors/load-error-client');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Not found"'
		);
		expect(await page.innerHTML('h1')).toBe('555');
	});

	test('client-side 4xx status without error from load()', async ({ page }) => {
		await page.goto('/errors/load-status-without-error-client');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Error: 401"'
		);
		expect(await page.innerHTML('h1')).toBe('401');
	});

	test('Root error falls back to error.html (unexpected error)', async ({ page, clicknav }) => {
		await page.goto('/errors/error-html');
		await clicknav('button:text-is("Unexpected")');

		expect(await page.textContent('h1')).toBe('Error - 500');
		expect(await page.textContent('p')).toBe(
			'This is the static error page with the following message: Failed to load (500 Internal Error)'
		);
	});

	test('Root error falls back to error.html (expected error)', async ({ page, clicknav }) => {
		await page.goto('/errors/error-html');
		await clicknav('button:text-is("Expected")');

		expect(await page.textContent('h1')).toBe('Error - 401');
		expect(await page.textContent('p')).toBe(
			'This is the static error page with the following message: Not allowed'
		);
	});

	test('Root 404 redirects somewhere due to root layout', async ({ page, baseURL, clicknav }) => {
		await page.goto('/errors/error-html');
		await clicknav('button:text-is("Redirect")');
		expect(page.url()).toBe(baseURL + '/load');
	});
});

test.describe('Prefetching', () => {
	test('prefetches programmatically', async ({ baseURL, page, app }) => {
		await page.goto('/routing/a');

		/** @type {string[]} */
		let requests = [];
		page.on('request', (r) => requests.push(r.url()));

		// also wait for network processing to complete, see
		// https://playwright.dev/docs/network#network-events
		await Promise.all([
			page.waitForResponse(`${baseURL}/routing/preloading/preloaded.json`),
			app.preloadData('/routing/preloading/preloaded')
		]);

		// svelte request made is environment dependent
		if (process.env.DEV) {
			expect(requests.filter((req) => req.endsWith('+page.svelte')).length).toBe(1);
		} else {
			// the preload helper causes an additional request to be made in Firefox,
			// so we use toBeGreaterThan rather than toBe
			expect(requests.filter((req) => req.endsWith('.js')).length).toBeGreaterThan(0);
		}

		expect(requests.includes(`${baseURL}/routing/preloading/preloaded.json`)).toBe(true);

		requests = [];
		await app.goto('/routing/preloading/preloaded');
		expect(requests).toEqual([]);

		try {
			await app.preloadData('https://example.com');
			throw new Error('Error was not thrown');
		} catch (/** @type {any} */ e) {
			expect(e.message).toMatch('Attempted to preload a URL that does not belong to this app');
		}
	});

	test('chooses correct route when hash route is preloaded but regular route is clicked', async ({
		app,
		page
	}) => {
		await page.goto('/routing/a');
		await app.preloadData('/routing/preloading/hash-route#please-dont-show-me');
		await app.goto('/routing/preloading/hash-route');
		await expect(page.locator('h1')).not.toHaveText('Oopsie');
	});

	test('does not rerun load on calls to duplicate preload hash route', async ({ app, page }) => {
		await page.goto('/routing/a');

		await app.preloadData('/routing/preloading/hash-route#please-dont-show-me');
		await app.preloadData('/routing/preloading/hash-route#please-dont-show-me');
		await app.goto('/routing/preloading/hash-route#please-dont-show-me');
		await expect(page.locator('p')).toHaveText('Loaded 1 times.');
	});

	test('does not rerun load on calls to different preload hash route', async ({ app, page }) => {
		await page.goto('/routing/a');

		await app.preloadData('/routing/preloading/hash-route#please-dont-show-me');
		await app.preloadData('/routing/preloading/hash-route#please-dont-show-me-jr');
		await app.goto('/routing/preloading/hash-route#please-dont-show-me');
		await expect(page.locator('p')).toHaveText('Loaded 1 times.');
	});

	test('does rerun load when preload errored', async ({ app, page }) => {
		await page.goto('/routing/a');

		await app.preloadData('/routing/preloading/preload-error');
		await app.goto('/routing/preloading/preload-error');
		await expect(page.locator('p')).toHaveText('hello');
	});
});

test.describe('Routing', () => {
	test('navigates to a new page without reloading', async ({ app, page, clicknav }) => {
		await page.goto('/routing');

		await app.preloadData('/routing/a').catch((e) => {
			// from error handler tests; ignore
			if (!e.message.includes('Crashing now')) throw e;
		});

		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await clicknav('a[href="/routing/a"]');
		expect(await page.textContent('h1')).toBe('a');

		expect(requests.filter((url) => !url.endsWith('/favicon.png'))).toEqual([]);
	});

	test('navigates programmatically', async ({ page, app }) => {
		await page.goto('/routing/a');
		await app.goto('/routing/b');
		expect(await page.textContent('h1')).toBe('b');
	});

	test('$page.url.hash is correctly set on page load', async ({ page }) => {
		await page.goto('/routing/hashes/pagestore#target');
		expect(await page.textContent('#window-hash')).toBe('#target');
		expect(await page.textContent('#page-url-hash')).toBe('#target');
	});

	test('$page.url.hash is correctly set on navigation', async ({ page }) => {
		await page.goto('/routing/hashes/pagestore');
		expect(await page.textContent('#window-hash')).toBe('');
		expect(await page.textContent('#page-url-hash')).toBe('');
		await page.locator('[href="#target"]').click();
		expect(await page.textContent('#window-hash')).toBe('#target');
		expect(await page.textContent('#page-url-hash')).toBe('#target');
		await page.locator('[href="/routing/hashes/pagestore"]').click();
		await expect(page.locator('#window-hash')).toHaveText('#target'); // hashchange doesn't fire for these
		await expect(page.locator('#page-url-hash')).toHaveText('');
		await page.goBack();
		expect(await page.textContent('#window-hash')).toBe('#target');
		expect(await page.textContent('#page-url-hash')).toBe('#target');
	});

	test('back button returns to previous route when previous route has been navigated to via hash anchor', async ({
		page,
		clicknav
	}) => {
		await page.goto('/routing/hashes/a');

		await page.locator('[href="#hash-target"]').click();
		await clicknav('[href="/routing/hashes/b"]');

		await page.goBack();
		expect(await page.textContent('h1')).toBe('a');
	});

	test('replaces state if the data-sveltekit-replacestate router option is specified for the hash link', async ({
		page,
		clicknav,
		baseURL
	}) => {
		await page.goto('/routing/hashes/a');

		await clicknav('[href="#hash-target"]');
		await clicknav('[href="#replace-state"]');

		await page.goBack();
		expect(await page.url()).toBe(`${baseURL}/routing/hashes/a`);
	});

	test('does not normalize external path', async ({ page, start_server }) => {
		const html_ok = '<html><head></head><body>ok</body></html>';
		const { port } = await start_server((_req, res) => {
			res.end(html_ok);
		});

		await page.goto(`/routing/slashes?port=${port}`);
		await page.locator(`a[href="http://localhost:${port}/with-slash/"]`).click();
		expect(await page.content()).toBe(html_ok);
		expect(page.url()).toBe(`http://localhost:${port}/with-slash/`);
	});

	test('ignores popstate events from outside the router', async ({ page }) => {
		await page.goto('/routing/external-popstate');
		expect(await page.textContent('h1')).toBe('hello');

		await page.locator('button').click();
		expect(await page.textContent('h1')).toBe('hello');

		await page.goBack();
		expect(await page.textContent('h1')).toBe('hello');

		await page.goForward();
		expect(await page.textContent('h1')).toBe('hello');
	});

	test('recognizes clicks outside the app target', async ({ page }) => {
		await page.goto('/routing/link-outside-app-target/source');

		await page.locator('[href="/routing/link-outside-app-target/target"]').click();
		await expect(page.locator('h1')).toHaveText('target: 1');
	});

	test('responds to <form method="GET"> submission without reload', async ({ page }) => {
		await page.goto('/routing/form-get');
		expect(await page.textContent('h1')).toBe('...');
		expect(await page.textContent('h2')).toBe('enter');
		expect(await page.textContent('h3')).toBe('...');

		/** @type {string[]} */
		const requests = [];
		page.on('request', (request) => requests.push(request.url()));

		await page.locator('input').fill('updated');
		await page.locator('button').click();

		expect(requests).toEqual([]);
		expect(await page.textContent('h1')).toBe('updated');
		expect(await page.textContent('h2')).toBe('form');
		expect(await page.textContent('h3')).toBe('bar');
	});

	test('ignores links with no href', async ({ page }) => {
		await page.goto('/routing/missing-href');
		const selector = '[data-testid="count"]';

		expect(await page.textContent(selector)).toBe('count: 1');

		await page.locator(selector).click();
		expect(await page.textContent(selector)).toBe('count: 1');
	});

	test('trailing slash redirect', async ({ page, clicknav }) => {
		await page.goto('/routing/trailing-slash');

		await clicknav('a[href="/routing/trailing-slash/always"]');
		expect(new URL(page.url()).pathname).toBe('/routing/trailing-slash/always/');
		await expect(page.locator('p')).toHaveText('/routing/trailing-slash/always/');

		await clicknav('a[href="/routing/trailing-slash/never/"]');
		expect(new URL(page.url()).pathname).toBe('/routing/trailing-slash/never');
		await expect(page.locator('p')).toHaveText('/routing/trailing-slash/never');

		await clicknav('a[href="/routing/trailing-slash/ignore/"]');
		expect(new URL(page.url()).pathname).toBe('/routing/trailing-slash/ignore/');
		await expect(page.locator('p')).toHaveText('/routing/trailing-slash/ignore/');
	});

	test('trailing slash redirect works when navigating from root page', async ({
		page,
		clicknav
	}) => {
		await page.goto('/');
		await clicknav('a[href="/routing/trailing-slash/never/"]');
		expect(new URL(page.url()).pathname).toBe('/routing/trailing-slash/never');
		await expect(page.locator('p')).toHaveText('/routing/trailing-slash/never');
	});
});

test.describe('Shadow DOM', () => {
	test('client router captures anchors in shadow dom', async ({ app, page, clicknav }) => {
		await page.goto('/routing/shadow-dom');

		await app.preloadData('/routing/a').catch((e) => {
			// from error handler tests; ignore
			if (!e.message.includes('Crashing now')) throw e;
		});

		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await clicknav('div[id="clickme"]');
		expect(await page.textContent('h1')).toBe('a');

		expect(requests.filter((url) => !url.endsWith('/favicon.png'))).toEqual([]);
	});
});

test.describe('cookies', () => {
	test('etag forwards cookies', async ({ page }) => {
		await page.goto('/cookies/forwarded-in-etag');
		await expect(page.locator('p')).toHaveText('foo=bar');
		await page.locator('button').click();
		await expect(page.locator('p')).toHaveText('foo=bar');
	});
});

test.describe('Interactivity', () => {
	test('click events on removed elements are ignored', async ({ page }) => {
		let errored = false;

		page.on('pageerror', (err) => {
			console.error(err);
			errored = true;
		});

		await page.goto('/interactivity/toggle-element');
		expect(await page.textContent('button')).toBe('remove');

		await page.locator('button').click();
		expect(await page.textContent('button')).toBe('add');
		expect(await page.textContent('a')).toBe('add');

		await page.locator('a').filter({ hasText: 'add' }).click();
		expect(await page.textContent('a')).toBe('remove');

		expect(errored).toBe(false);
	});
});

test.describe('Load', () => {
	if (process.env.DEV) {
		test('using window.fetch does not cause false-positive warning', async ({ page, baseURL }) => {
			/** @type {string[]} */
			const warnings = [];
			page.on('console', (msg) => {
				if (msg.type() === 'warning') {
					warnings.push(msg.text());
				}
			});

			await page.goto('/load/window-fetch/outside-load');
			expect(await page.textContent('h1')).toBe('42');

			expect(warnings).not.toContain(
				`Loading ${baseURL}/load/window-fetch/data.json using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://kit.svelte.dev/docs/load#making-fetch-requests`
			);
		});
	}
});
