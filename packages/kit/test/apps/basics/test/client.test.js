import { expect } from '@playwright/test';
import { start_server, test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('beforeNavigate', () => {
	test('prevents navigation triggered by link click', async ({ clicknav, page, baseURL }) => {
		await page.goto('/before-navigate/prevent-navigation');

		try {
			await clicknav('[href="/before-navigate/a"]', { timeout: 1000 });
			expect(false).toBe(true);
		} catch (/** @type {any} */ e) {
			expect(e.message).toMatch('page.waitForNavigation: Timeout 1000ms exceeded');
		}

		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('true');
	});

	test('prevents navigation triggered by goto', async ({ page, app, baseURL }) => {
		await page.goto('/before-navigate/prevent-navigation');
		await app.goto('/before-navigate/a');
		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('true');
	});

	test('prevents navigation triggered by back button', async ({ page, app, baseURL }) => {
		await page.goto('/before-navigate/a');
		await app.goto('/before-navigate/prevent-navigation');
		await page.click('h1'); // The browsers block attempts to prevent navigation on a frame that's never had a user gesture.

		await page.goBack();
		expect(await page.innerHTML('pre')).toBe('true');
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
		await page.click('#scroll-anchor');
		const originalScrollY = /** @type {number} */ (await page.evaluate(() => scrollY));
		await clicknav('#routing-page');
		await page.goBack();
		expect(page.url()).toBe(baseURL + '/anchor#last-anchor-2');
		expect(await page.evaluate(() => scrollY)).toEqual(originalScrollY);

		await page.goBack();
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

		await page.click('[href="/scroll/cross-document/b"]');
		await expect(page.locator('h1')).toHaveText('b');
		await page.waitForSelector('body.started');

		await clicknav('[href="/scroll/cross-document/c"]');
		await expect(page.locator('h1')).toHaveText('c');

		await page.goBack(); // client-side back
		await page.goBack(); // native back
		await expect(page.locator('h1')).toHaveText('a');
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
		await expect(page.locator('h1')).toHaveText('undefined -> /after-navigate/a');

		await clicknav('[href="/after-navigate/b"]');
		await expect(page.locator('h1')).toHaveText('/after-navigate/a -> /after-navigate/b');
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
		await page.click('.del');
		expect(await page.innerHTML('h1')).toBe('deleted 42');
	});
});

test.describe('Errors', () => {
	test('client-side load errors', async ({ page }) => {
		await page.goto('/errors/load-client');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Crashing now"'
		);
	});

	test('client-side module context errors', async ({ page }) => {
		await page.goto('/errors/module-scope-client');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Crashing now"'
		);
	});

	test('client-side error from load()', async ({ page }) => {
		await page.goto('/errors/load-error-client');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Not found"'
		);
		expect(await page.innerHTML('h1')).toBe('555');
	});

	test('client-side 4xx status without error from load()', async ({ page }) => {
		await page.goto('/errors/load-status-without-error-client');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Error: 401"'
		);
		expect(await page.innerHTML('h1')).toBe('401');
	});
});

test.describe('Load', () => {
	test('load function is only called when necessary', async ({ app, page }) => {
		await page.goto('/load/change-detection/one/a');
		await expect(page.locator('h1')).toHaveText('layout loads: 1');
		await expect(page.locator('h2')).toHaveText('x: a: 1');

		await app.goto('/load/change-detection/one/a?unused=whatever');
		await expect(page.locator('h2')).toHaveText('x: a: 1');

		await app.goto('/load/change-detection/two/b');
		await expect(page.locator('h2')).toHaveText('y: b: 1');

		await app.goto('/load/change-detection/one/a');
		await expect(page.locator('h2')).toHaveText('x: a: 2');

		await app.goto('/load/change-detection/one/b');
		await expect(page.locator('h2')).toHaveText('x: b: 3');

		await app.invalidate('/load/change-detection/data.json');
		await expect(page.locator('h1')).toHaveText('layout loads: 2');
		await expect(page.locator('h2')).toHaveText('x: b: 3');

		await app.invalidate('/load/change-detection/data.json');
		await expect(page.locator('h1')).toHaveText('layout loads: 3');
		await expect(page.locator('h2')).toHaveText('x: b: 3');

		await app.invalidate('custom:change-detection-layout');
		await expect(page.locator('h1')).toHaveText('layout loads: 4');
		await expect(page.locator('h2')).toHaveText('x: b: 3');

		await page.click('button:has-text("invalidate change-detection/data.json")');
		await page.waitForFunction('window.invalidated');
		await expect(page.locator('h1')).toHaveText('layout loads: 5');
		await expect(page.locator('h2')).toHaveText('x: b: 3');

		await page.click('button:has-text("invalidate all")');
		await page.waitForFunction('window.invalidated');
		await expect(page.locator('h1')).toHaveText('layout loads: 6');
		await expect(page.locator('h2')).toHaveText('x: b: 4');
	});

	test('load function is only called on session change when used in load', async ({ page }) => {
		await page.goto('/load/change-detection/session/used');
		await expect(page.locator('h2')).toHaveText('1');
		await page.click('button');
		await expect(page.locator('h2')).toHaveText('2');

		await page.goto('/load/change-detection/session/unused');
		await expect(page.locator('h2')).toHaveText('1');
		await page.click('button');
		await expect(page.locator('h2')).toHaveText('1');
	});

	test('accessing url.hash from load errors and suggests using page store', async ({ page }) => {
		await page.goto('/load/url-hash#please-dont-send-me-to-load');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "url.hash is inaccessible from load. Consider accessing hash from the page store within the script tag of your component."'
		);
	});

	test('url instance methods work in load', async ({ page }) => {
		await page.goto('/load/url-to-string');
		await expect(page.locator('h1')).toHaveText("I didn't break!");
	});

	test("layout props don't cause rerender when unchanged", async ({ page, clicknav }) => {
		await page.goto('/load/layout-props/a');
		await expect(page.locator('h1')).toHaveText('1');
		await clicknav('[href="/load/layout-props/b"]');
		await expect(page.locator('h1')).toHaveText('1');
		await page.click('button');
		await expect(page.locator('h1')).toHaveText('2');
	});

	if (process.env.DEV) {
		test('using window.fetch causes a warning', async ({ page }) => {
			const port = 5173;

			/** @type {string[]} */
			const warnings = [];

			page.on('console', (msg) => {
				if (msg.type() === 'warning') {
					warnings.push(msg.text());
				}
			});

			await page.goto('/load/window-fetch/incorrect');
			await expect(page.locator('h1')).toHaveText('42');

			expect(warnings).toContain(
				`Loading http://localhost:${port}/load/window-fetch/data.json using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://kit.svelte.dev/docs/load#input-fetch`
			);

			warnings.length = 0;

			await page.goto('/load/window-fetch/correct');
			await expect(page.locator('h1')).toHaveText('42');

			expect(warnings).not.toContain(
				`Loading http://localhost:${port}/load/window-fetch/data.json using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://kit.svelte.dev/docs/load#input-fetch`
			);
		});
	}
});

test.describe('Page options', () => {
	test('disables router if router=false', async ({ page, clicknav }) => {
		await page.goto('/no-router/a');

		await page.click('button');
		await expect(page.locator('button')).toHaveText('clicks: 1');

		await Promise.all([page.waitForNavigation(), page.click('[href="/no-router/b"]')]);
		await expect(page.locator('button')).toHaveText('clicks: 0');

		// wait until hydration before interacting with button
		await page.waitForSelector('body.started');

		await page.click('button');
		await expect(page.locator('button')).toHaveText('clicks: 1');

		// wait until hydration before attempting backwards client-side navigation
		await page.waitForSelector('body.started');

		await clicknav('[href="/no-router/a"]');
		await expect(page.locator('button')).toHaveText('clicks: 1');

		await Promise.all([page.waitForNavigation(), page.click('[href="/no-router/b"]')]);
		await expect(page.locator('button')).toHaveText('clicks: 0');
	});

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
			page.waitForResponse(`${baseURL}/routing/prefetched.json`),
			app.prefetch('/routing/prefetched')
		]);

		// svelte request made is environment dependent
		if (process.env.DEV) {
			expect(requests.filter((req) => req.endsWith('+page.svelte')).length).toBe(1);
		} else {
			// the preload helper causes an additional request to be made in Firefox,
			// so we use toBeGreaterThan rather than toBe
			expect(requests.filter((req) => req.endsWith('.js')).length).toBeGreaterThan(0);
		}

		expect(requests.includes(`${baseURL}/routing/prefetched.json`)).toBe(true);

		requests = [];
		await app.goto('/routing/prefetched');
		expect(requests).toEqual([]);

		try {
			await app.prefetch('https://example.com');
			throw new Error('Error was not thrown');
		} catch (/** @type {any} */ e) {
			expect(e.message).toMatch('Attempted to prefetch a URL that does not belong to this app');
		}
	});

	test('chooses correct route when hash route is prefetched but regular route is clicked', async ({
		app,
		page
	}) => {
		await page.goto('/routing/a');
		await app.prefetch('/routing/prefetched/hash-route#please-dont-show-me');
		await app.goto('/routing/prefetched/hash-route');
		await expect(page.locator('h1')).not.toHaveText('Oopsie');
	});

	test('does not rerun load on calls to duplicate preload hash route', async ({ app, page }) => {
		await page.goto('/routing/a');

		await app.prefetch('/routing/prefetched/hash-route#please-dont-show-me');
		await app.prefetch('/routing/prefetched/hash-route#please-dont-show-me');
		await app.goto('/routing/prefetched/hash-route#please-dont-show-me');
		await expect(page.locator('p')).toHaveText('Loaded 1 times.');
	});

	test('does not rerun load on calls to different preload hash route', async ({ app, page }) => {
		await page.goto('/routing/a');

		await app.prefetch('/routing/prefetched/hash-route#please-dont-show-me');
		await app.prefetch('/routing/prefetched/hash-route#please-dont-show-me-jr');
		await app.goto('/routing/prefetched/hash-route#please-dont-show-me');
		await expect(page.locator('p')).toHaveText('Loaded 1 times.');
	});
});

test.describe('Routing', () => {
	test('navigates to a new page without reloading', async ({ app, page, clicknav }) => {
		await page.goto('/routing');

		await app.prefetch('/routing/a').catch((e) => {
			// from error handler tests; ignore
			if (!e.message.includes('Crashing now')) throw e;
		});

		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await clicknav('a[href="/routing/a"]');
		await expect(page.locator('h1')).toHaveText('a');

		expect(requests).toEqual([]);
	});

	test('navigates programmatically', async ({ page, app }) => {
		await page.goto('/routing/a');
		await app.goto('/routing/b');
		await expect(page.locator('h1')).toHaveText('b');
	});

	test('$page.url.hash is correctly set on page load', async ({ page }) => {
		await page.goto('/routing/hashes/pagestore#target');
		await expect(page.locator('#window-hash')).toHaveText('#target');
		await expect(page.locator('#page-url-hash')).toHaveText('#target');
	});

	test('$page.url.hash is correctly set on navigation', async ({ page }) => {
		await page.goto('/routing/hashes/pagestore');
		await expect(page.locator('#window-hash')).toHaveText(/^$/);
		await expect(page.locator('#page-url-hash')).toHaveText(/^$/);
		await page.click('[href="#target"]');
		await expect(page.locator('#window-hash')).toHaveText('#target');
		await expect(page.locator('#page-url-hash')).toHaveText('#target');
	});

	test('does not normalize external path', async ({ page }) => {
		const urls = [];

		const { port, close } = await start_server((req, res) => {
			urls.push(req.url);
			res.end('ok');
		});

		try {
			await page.goto(`/routing/slashes?port=${port}`);
			await page.click(`a[href="http://localhost:${port}/with-slash/"]`);

			expect(urls).toEqual(['/with-slash/']);
		} finally {
			await close();
		}
	});
});

test.describe('Shadow DOM', () => {
	test('client router captures anchors in shadow dom', async ({ app, page, clicknav }) => {
		await page.goto('/routing/shadow-dom');

		await app.prefetch('/routing/a').catch((e) => {
			// from error handler tests; ignore
			if (!e.message.includes('Crashing now')) throw e;
		});

		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await clicknav('div[id="clickme"]');
		await expect(page.locator('h1')).toHaveText('a');

		expect(requests).toEqual([]);
	});
});

test.describe('Page Store', () => {
	test('Updates data if changed even when no URL change visible', async ({ page }) => {
		await page.goto('/store/data/only-data-changes');
		await expect(page.locator('#page-data')).toHaveText('{"answer":42,"calls":0}');
		await expect(page.locator('#store-data')).toHaveText(
			'{"foo":{"bar":"Custom layout"},"name":"SvelteKit","value":123,"answer":42,"calls":0}'
		);

		await page.click('button');

		await expect(page.locator('#page-data')).toHaveText('{"answer":1337}');
		await expect(page.locator('#store-data')).toHaveText(
			'{"foo":{"bar":"Custom layout"},"name":"SvelteKit","value":123,"answer":1337}'
		);
	});
});
