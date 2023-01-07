import { expect } from '@playwright/test';
import { start_server, test } from '../../../utils.js';

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

	(process.env.KIT_E2E_BROWSER === 'webkit' ? test.skip : test)(
		'applies autofocus after an enhanced form submit',
		async ({ page }) => {
			await page.goto('/accessibility/autofocus/b');

			await page.click('#submit');
			await page.waitForFunction(() => document.activeElement?.nodeName === 'INPUT', null, {
				timeout: 1000
			});
		}
	);

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
});

test.describe('Caching', () => {
	test('caches __data.json requests with invalidated search param', async ({ page, app }) => {
		await page.goto('/');
		const [, response] = await Promise.all([
			app.goto('/caching/server-data'),
			page.waitForResponse((request) =>
				request.url().endsWith('server-data/__data.json?x-sveltekit-invalidated=_1')
			)
		]);
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});
});

test.describe('beforeNavigate', () => {
	test('prevents navigation triggered by link click', async ({ page, baseURL }) => {
		await page.goto('/before-navigate/prevent-navigation');

		await page.click('[href="/before-navigate/a"]');
		await page.waitForLoadState('networkidle');

		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('1 false link');
	});

	test('prevents navigation to external', async ({ page, baseURL }) => {
		await page.goto('/before-navigate/prevent-navigation');
		await page.click('h1'); // The browsers block attempts to prevent navigation on a frame that's never had a user gesture.

		page.on('dialog', (dialog) => dialog.dismiss());

		page.click('a[href="https://google.de"]'); // do NOT await this, promise only resolves after successful navigation, which never happens
		await page.waitForTimeout(500);
		await expect(page.locator('pre')).toHaveText('1 true link');
		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
	});

	test('prevents navigation triggered by goto', async ({ page, app, baseURL }) => {
		await page.goto('/before-navigate/prevent-navigation');
		await app.goto('/before-navigate/a');
		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('1 false goto');
	});

	test('prevents external navigation triggered by goto', async ({ page, app, baseURL }) => {
		await page.goto('/before-navigate/prevent-navigation');
		await app.goto('https://google.de');
		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('1 true goto');
	});

	test('prevents navigation triggered by back button', async ({ page, app, baseURL }) => {
		await page.goto('/before-navigate/a');
		await app.goto('/before-navigate/prevent-navigation');
		await page.click('h1'); // The browsers block attempts to prevent navigation on a frame that's never had a user gesture.

		await page.goBack();
		expect(await page.innerHTML('pre')).toBe('1 false popstate');
		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
	});

	test('prevents unload', async ({ page }) => {
		await page.goto('/before-navigate/prevent-navigation');
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

	test('is not triggered on redirect', async ({ page, baseURL }) => {
		await page.goto('/before-navigate/prevent-navigation');

		await page.click('[href="/before-navigate/redirect"]');
		await page.waitForLoadState('networkidle');

		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('1 false link');
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
		expect(await page.evaluate(() => scrollY === 0)).toBeTruthy();
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
		expect(await page.evaluate(() => scrollY === 0)).toBeTruthy();
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

test.describe('afterNavigate', () => {
	test('calls callback', async ({ page, clicknav }) => {
		await page.goto('/after-navigate/a');
		expect(await page.textContent('h1')).toBe('undefined -> /after-navigate/a');

		await clicknav('[href="/after-navigate/b"]');
		expect(await page.textContent('h1')).toBe('/after-navigate/a -> /after-navigate/b');
	});
});

test.describe('a11y', () => {
	test('keepfocus works', async ({ page }) => {
		await page.goto('/keepfocus');

		await Promise.all([
			page.type('#input', 'bar'),
			page.waitForFunction(() => window.location.search === '?foo=bar')
		]);
		await expect(page.locator('#input')).toBeFocused();
	});
});

test.describe('CSS', () => {
	test('applies generated component styles (hides announcer)', async ({ page, clicknav }) => {
		await page.goto('/css');
		await clicknav('[href="/css/other"]');

		expect(
			await page.evaluate(() => {
				const el = document.querySelector('#svelte-announcer');
				return el && getComputedStyle(el).position;
			})
		).toBe('absolute');
	});
});

test.describe('Endpoints', () => {
	test('calls a delete handler', async ({ page }) => {
		await page.goto('/delete-route');
		await page.locator('.del').click();
		expect(await page.innerHTML('h1')).toBe('deleted 42');
	});
});

test.describe.serial('Errors', () => {
	test('client-side load errors', async ({ page }) => {
		await page.goto('/errors/load-client');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Crashing now"'
		);
	});

	test('client-side module context errors', async ({ page }) => {
		await page.goto('/errors/module-scope-client');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Crashing now"'
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
			'This is the static error page with the following message: Failed to load'
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

test.describe('Load', () => {
	test('load function is only called when necessary', async ({ app, page }) => {
		await page.goto('/load/change-detection/one/a');
		expect(await page.textContent('h1')).toBe('layout loads: 1');
		expect(await page.textContent('h2')).toBe('x: a: 1');

		await app.goto('/load/change-detection/one/a?unused=whatever');
		expect(await page.textContent('h2')).toBe('x: a: 1');

		await app.goto('/load/change-detection/two/b');
		expect(await page.textContent('h2')).toBe('y: b: 1');

		await app.goto('/load/change-detection/one/a');
		expect(await page.textContent('h2')).toBe('x: a: 2');

		await app.goto('/load/change-detection/one/b');
		expect(await page.textContent('h2')).toBe('x: b: 3');

		await app.invalidate('/load/change-detection/data.json');
		expect(await page.textContent('h1')).toBe('layout loads: 2');
		expect(await page.textContent('h2')).toBe('x: b: 3');

		await app.invalidate('/load/change-detection/data.json');
		expect(await page.textContent('h1')).toBe('layout loads: 3');
		expect(await page.textContent('h2')).toBe('x: b: 3');

		await app.invalidate('custom:change-detection-layout');
		expect(await page.textContent('h1')).toBe('layout loads: 4');
		expect(await page.textContent('h2')).toBe('x: b: 3');

		await page.click('button:has-text("invalidate change-detection/data.json")');
		await page.waitForFunction('window.invalidated');
		expect(await page.textContent('h1')).toBe('layout loads: 5');
		expect(await page.textContent('h2')).toBe('x: b: 3');

		await page.click('button:has-text("invalidate all")');
		await page.waitForFunction('window.invalidated');
		expect(await page.textContent('h1')).toBe('layout loads: 6');
		expect(await page.textContent('h2')).toBe('x: b: 4');
	});

	test('accessing url.hash from load errors and suggests using page store', async ({ page }) => {
		await page.goto('/load/url-hash#please-dont-send-me-to-load');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Cannot access event.url.hash. Consider using `$page.url.hash` inside a component instead"'
		);
	});

	test('url instance methods work in load', async ({ page }) => {
		await page.goto('/load/url-to-string');
		expect(await page.textContent('h1')).toBe("I didn't break!");
	});

	test('server data from previous is not reused if next page has no load function', async ({
		page,
		app
	}) => {
		await page.goto('/load/server-data-reuse/with-server-load');
		expect(await page.textContent('pre')).toBe(
			JSON.stringify({ foo: { bar: 'Custom layout' }, server: true })
		);
		await app.goto('/load/server-data-reuse/no-load');
		expect(await page.textContent('pre')).toBe(JSON.stringify({ foo: { bar: 'Custom layout' } }));
	});

	test('keeps server data when valid while not reusing client load data', async ({
		page,
		clicknav
	}) => {
		await page.goto('/load/url-query-param');

		expect(await page.textContent('h1')).toBe('Hello ');
		expect(await page.textContent('p')).toBe('This text comes from the server load function');

		await clicknav('a[href="/load/url-query-param?currentClientState=ABC"]');
		expect(await page.textContent('h1')).toBe('Hello ABC');
		expect(await page.textContent('p')).toBe('This text comes from the server load function');

		await clicknav('a[href="/load/url-query-param?currentClientState=DEF"]');
		expect(await page.textContent('h1')).toBe('Hello DEF');
		expect(await page.textContent('p')).toBe('This text comes from the server load function');

		await clicknav('a[href="/load/url-query-param"]');
		expect(await page.textContent('h1')).toBe('Hello ');
		expect(await page.textContent('p')).toBe('This text comes from the server load function');
	});

	test('load does not call fetch if max-age allows it', async ({ page }) => {
		page.addInitScript(`
			window.now = 0;
			window.performance.now = () => now;
		`);

		await page.goto('/load/cache-control/default');
		await expect(page.getByText('Count is 0')).toBeVisible();
		await page.locator('button').click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByText('Count is 0')).toBeVisible();

		await page.evaluate(() => (window.now = 2500));

		await page.locator('button').click();
		await expect(page.getByText('Count is 2')).toBeVisible();
	});

	test('load does ignore ttl if fetch cache options says so', async ({ page }) => {
		await page.goto('/load/cache-control/force');
		await expect(page.getByText('Count is 0')).toBeVisible();
		await page.locator('button').click();
		await expect(page.getByText('Count is 1')).toBeVisible();
	});

	test('load busts cache if non-GET request to resource is made', async ({ page }) => {
		await page.goto('/load/cache-control/bust');
		await expect(page.getByText('Count is 0')).toBeVisible();
		await page.locator('button').click();
		await expect(page.getByText('Count is 1')).toBeVisible();
	});

	test('__data.json has cache-control: private, no-store', async ({ page, clicknav }) => {
		await page.goto('/load/server-data-nostore?x=1');

		const [response] = await Promise.all([
			page.waitForResponse((response) => /__data\.js/.test(response.url())),
			clicknav('[href="/load/server-data-nostore?x=2"]')
		]);

		expect(response.headers()['cache-control']).toBe('private, no-store');
	});

	test('cache with body hash', async ({ page, clicknav }) => {
		// 1. go to the page (first load, we expect the right data)
		await page.goto('/load/fetch-cache-control/load-data');
		expect(await page.textContent('div#fr')).toBe(JSON.stringify({ hi: 'bonjour' }));
		expect(await page.textContent('div#hu')).toBe(JSON.stringify({ hi: 'szia' }));

		// 2. change to another route (client side)
		await clicknav('[href="/load/fetch-cache-control"]');

		// 3. come back to the original page (client side)
		let did_request_data = false;
		page.on('request', (request) => {
			if (request.url().endsWith('fetch-cache-control/load-data')) {
				did_request_data = true;
			}
		});
		await clicknav('[href="/load/fetch-cache-control/load-data"]');

		// 4. data should still be the same (and cached)
		expect(await page.textContent('div#fr')).toBe(JSON.stringify({ hi: 'bonjour' }));
		expect(await page.textContent('div#hu')).toBe(JSON.stringify({ hi: 'szia' }));
		expect(did_request_data).toBe(false);
	});

	if (process.env.DEV) {
		test('using window.fetch causes a warning', async ({ page, baseURL }) => {
			await Promise.all([
				page.goto('/load/window-fetch/incorrect'),
				page.waitForEvent('console', {
					predicate: (message) => {
						return (
							message.text() ===
							`Loading ${baseURL}/load/window-fetch/data.json using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://kit.svelte.dev/docs/load#making-fetch-requests`
						);
					},
					timeout: 3_000
				})
			]);
			expect(await page.textContent('h1')).toBe('42');

			/** @type {string[]} */
			const warnings = [];
			page.on('console', (msg) => {
				if (msg.type() === 'warning') {
					warnings.push(msg.text());
				}
			});

			await page.goto('/load/window-fetch/correct');
			expect(await page.textContent('h1')).toBe('42');

			expect(warnings).not.toContain(
				`Loading ${baseURL}/load/window-fetch/data.json using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://kit.svelte.dev/docs/load#making-fetch-requests`
			);
		});
	}
});

test.describe('Page options', () => {
	test('applies generated component styles with ssr=false (hides announcer)', async ({
		page,
		clicknav
	}) => {
		await page.goto('/no-ssr');
		await clicknav('[href="/no-ssr/other"]');

		expect(
			await page.evaluate(() => {
				const el = document.querySelector('#svelte-announcer');
				return el && getComputedStyle(el).position;
			})
		).toBe('absolute');
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
	});

	test('does not normalize external path', async ({ page }) => {
		/** @type {Array<string|undefined>} */
		const urls = [];

		const { port, close } = await start_server((req, res) => {
			if (req.url !== '/favicon.ico') urls.push(req.url);
			res.end('ok');
		});

		try {
			await page.goto(`/routing/slashes?port=${port}`);
			await page.locator(`a[href="http://localhost:${port}/with-slash/"]`).click();

			expect(urls).toEqual(['/with-slash/']);
		} finally {
			await close();
		}
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

test.describe('SPA mode / no SSR', () => {
	test('Can use browser-only global on client-only page through ssr config in handle', async ({
		page,
		read_errors
	}) => {
		await page.goto('/no-ssr/browser-only-global');
		await expect(page.locator('p')).toHaveText('Works');
		expect(read_errors('/no-ssr/browser-only-global')).toBe(undefined);
	});

	test('Can use browser-only global on client-only page through ssr config in +layout.js', async ({
		page,
		read_errors
	}) => {
		await page.goto('/no-ssr/ssr-page-config');
		await expect(page.locator('p')).toHaveText('Works');
		expect(read_errors('/no-ssr/ssr-page-config')).toBe(undefined);
	});

	test('Can use browser-only global on client-only page through ssr config in +page.js', async ({
		page,
		read_errors
	}) => {
		await page.goto('/no-ssr/ssr-page-config/layout/inherit');
		await expect(page.locator('p')).toHaveText('Works');
		expect(read_errors('/no-ssr/ssr-page-config/layout/inherit')).toBe(undefined);
	});

	test('Cannot use browser-only global on page because of ssr config in +page.js', async ({
		page
	}) => {
		await page.goto('/no-ssr/ssr-page-config/layout/overwrite');
		await expect(page.locator('p')).toHaveText(
			'This is your custom error page saying: "document is not defined"'
		);
	});
});

test.describe('$app/stores', () => {
	test('can use $app/stores from anywhere on client', async ({ page }) => {
		await page.goto('/store/client-access');
		await expect(page.locator('h1')).toHaveText('undefined');
		await page.locator('button').click();
		await expect(page.locator('h1')).toHaveText('/store/client-access');
	});

	test('$page.data does not update if data is unchanged', async ({ page, app }) => {
		await page.goto('/store/data/unchanged/a');
		await app.goto('/store/data/unchanged/b');
		await expect(page.locator('p')).toHaveText('$page.data was updated 0 time(s)');
	});
});

test.describe('Invalidation', () => {
	test('+layout.server.js does not re-run when downstream load functions are invalidated', async ({
		page,
		clicknav
	}) => {
		await page.goto('/load/unchanged/isolated/a');
		expect(await page.textContent('h1')).toBe('slug: a');
		expect(await page.textContent('h2')).toBe('count: 0');

		await clicknav('[href="/load/unchanged/isolated/b"]');
		expect(await page.textContent('h1')).toBe('slug: b');
		expect(await page.textContent('h2')).toBe('count: 0');
	});

	test('+layout.server.js re-runs when await parent() is called from downstream load function', async ({
		page,
		clicknav
	}) => {
		await page.goto('/load/unchanged-parent/uses-parent/a');
		expect(await page.textContent('h1')).toBe('slug: a');
		expect(await page.textContent('h2')).toBe('count: 0');
		expect(await page.textContent('h3')).toBe('doubled: 0');

		await clicknav('[href="/load/unchanged-parent/uses-parent/b"]');
		expect(await page.textContent('h1')).toBe('slug: b');
		expect(await page.textContent('h2')).toBe('count: 0');

		// this looks wrong, but is actually the intended behaviour (the increment side-effect in a GET would be a bug in a real app)
		expect(await page.textContent('h3')).toBe('doubled: 2');
	});

	test('load function re-runs when searchParams change', async ({ page, clicknav }) => {
		await page.goto('/load/invalidation/url?a=1');
		expect(await page.textContent('h1')).toBe('1');

		await clicknav('[href="?a=2"]');
		expect(await page.textContent('h1')).toBe('2');

		await clicknav('[href="?a=3"]');
		expect(await page.textContent('h1')).toBe('3');
	});

	test('server-only load functions are re-run following forced invalidation', async ({ page }) => {
		await page.goto('/load/invalidation/forced');
		expect(await page.textContent('h1')).toBe('a: 0, b: 1');

		await page.click('button.invalidateall');
		await page.evaluate(() => window.promise);
		expect(await page.textContent('h1')).toBe('a: 2, b: 3');

		await page.click('button.invalidateall');
		await page.evaluate(() => window.promise);
		expect(await page.textContent('h1')).toBe('a: 4, b: 5');
	});

	test('server-only load functions are re-run following goto with forced invalidation', async ({
		page
	}) => {
		await page.goto('/load/invalidation/forced-goto');
		expect(await page.textContent('h1')).toBe('a: 0, b: 1');

		await page.click('button.goto');
		await page.evaluate(() => window.promise);
		expect(await page.textContent('h1')).toBe('a: 2, b: 3');
	});

	test('multiple invalidations run concurrently', async ({ page }) => {
		await page.goto('/load/invalidation/multiple');
		await expect(page.getByText('layout: 0, page: 0')).toBeVisible();

		await page.click('button.layout');
		await page.click('button.layout');
		await page.click('button.page');
		await page.click('button.page');
		await page.click('button.layout');
		await page.click('button.page');
		await page.click('button.all');
		await expect(page.getByText('layout: 4, page: 4')).toBeVisible();
	});

	test('invalidateAll persists through redirects', async ({ page }) => {
		await page.goto('/load/invalidation/multiple/redirect');
		await page.locator('button.redirect').click();
		await expect(page.locator('p.redirect-state')).toHaveText('Redirect state: done');
	});

	test('+layout(.server).js is re-run when server dep is invalidated', async ({ page }) => {
		await page.goto('/load/invalidation/depends');
		const server = await page.textContent('p.server');
		const shared = await page.textContent('p.shared');
		expect(server).toBeDefined();
		expect(shared).toBeDefined();

		await page.click('button.server');
		await page.evaluate(() => window.promise);
		const next_server = await page.textContent('p.server');
		const next_shared = await page.textContent('p.shared');
		expect(server).not.toBe(next_server);
		expect(shared).not.toBe(next_shared);
	});

	test('+layout.js is re-run when shared dep is invalidated', async ({ page }) => {
		await page.goto('/load/invalidation/depends');
		const server = await page.textContent('p.server');
		const shared = await page.textContent('p.shared');
		expect(server).toBeDefined();
		expect(shared).toBeDefined();

		await page.click('button.shared');
		await page.evaluate(() => window.promise);
		const next_server = await page.textContent('p.server');
		const next_shared = await page.textContent('p.shared');
		expect(server).toBe(next_server);
		expect(shared).not.toBe(next_shared);
	});

	test('Parameter use is tracked even for routes that do not use the parameters', async ({
		page,
		clicknav
	}) => {
		await page.goto('/load/invalidation/params');

		await clicknav('[href="/load/invalidation/params/1"]');
		expect(await page.textContent('pre')).toBe('{"a":"1"}');

		await clicknav('[href="/load/invalidation/params/1/x"]');
		expect(await page.textContent('pre')).toBe('{"a":"1","b":"x"}');

		await page.goBack();
		expect(await page.textContent('pre')).toBe('{"a":"1"}');
	});

	test('route.id use is tracked for server-only load functions', async ({ page, clicknav }) => {
		await page.goto('/load/invalidation/route/server/a');
		expect(await page.textContent('h1')).toBe('route.id: /load/invalidation/route/server/a');

		await clicknav('[href="/load/invalidation/route/server/b"]');
		expect(await page.textContent('h1')).toBe('route.id: /load/invalidation/route/server/b');
	});

	test('route.id use is tracked for shared load functions', async ({ page, clicknav }) => {
		await page.goto('/load/invalidation/route/shared/a');
		expect(await page.textContent('h1')).toBe('route.id: /load/invalidation/route/shared/a');

		await clicknav('[href="/load/invalidation/route/shared/b"]');
		expect(await page.textContent('h1')).toBe('route.id: /load/invalidation/route/shared/b');
	});

	test('$page.url can safely be mutated', async ({ page }) => {
		await page.goto('/load/mutated-url?q=initial');
		await expect(page.getByText('initial')).toBeVisible();

		await page.locator('button').click();
		await expect(page.getByText('updated')).toBeVisible();
	});
});

test.describe('data-sveltekit attributes', () => {
	test('data-sveltekit-preload-data', async ({ baseURL, page }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		const module = process.env.DEV
			? `${baseURL}/src/routes/data-sveltekit/preload-data/target/+page.svelte`
			: `${baseURL}/_app/immutable/components/pages/data-sveltekit/preload-data/target/_page`;

		await page.goto('/data-sveltekit/preload-data');
		await page.locator('#one').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);
		expect(requests.find((r) => r.startsWith(module))).toBeDefined();

		requests.length = 0;
		await page.goto('/data-sveltekit/preload-data');
		await page.locator('#two').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);
		expect(requests.find((r) => r.startsWith(module))).toBeDefined();

		requests.length = 0;
		await page.goto('/data-sveltekit/preload-data');
		await page.locator('#three').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);
		expect(requests.find((r) => r.startsWith(module))).toBeUndefined();
	});

	test('data-sveltekit-reload', async ({ baseURL, page, clicknav }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await page.goto('/data-sveltekit/reload');
		await page.locator('#one').click();
		expect(requests).toContain(`${baseURL}/data-sveltekit/reload/target`);

		requests.length = 0;
		await page.goto('/data-sveltekit/reload');
		await page.locator('#two').click();
		expect(requests).toContain(`${baseURL}/data-sveltekit/reload/target`);

		requests.length = 0;
		await page.goto('/data-sveltekit/reload');
		await clicknav('#three');
		expect(requests).not.toContain(`${baseURL}/data-sveltekit/reload/target`);
	});

	test('data-sveltekit-noscroll', async ({ page, clicknav }) => {
		await page.goto('/data-sveltekit/noscroll');
		// await page.evaluate(() => window.scrollTo(0, 1000));
		await clicknav('#one');
		expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

		await page.goto('/data-sveltekit/noscroll');
		await clicknav('#two');
		expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

		await page.goto('/data-sveltekit/noscroll');
		// await page.evaluate(() => window.scrollTo(0, 1000));
		await clicknav('#three');
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
	});
});

test.describe('Content negotiation', () => {
	test('+server.js next to +page.svelte works', async ({ page }) => {
		await page.goto('/routing/content-negotiation');
		expect(await page.textContent('p')).toBe('Hi');

		for (const method of ['GET', 'PUT', 'PATCH', 'POST', 'DELETE']) {
			await page.click(`button:has-text("${method}")`);
			await page.waitForFunction(
				(method) => document.querySelector('pre')?.textContent === method,
				method
			);
		}
	});

	test('use:enhance uses action, not POST handler', async ({ page }) => {
		await page.goto('/routing/content-negotiation');

		await Promise.all([
			page.waitForResponse('/routing/content-negotiation'),
			page.click('button:has-text("Submit")')
		]);

		await expect(page.locator('[data-testid="form-result"]')).toHaveText('form.submitted: true');
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
