import { expect } from '@playwright/test';
import { start_server, test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('beforeNavigate', () => {
	test('prevents navigation triggered by link click', async ({ page, baseURL }) => {
		await page.goto('/before-navigate/prevent-navigation');

		await page.click('[href="/before-navigate/a"]');
		await page.waitForLoadState('networkidle');

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

		await page.click('[href="/scroll/cross-document/b"]');
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
		await page.click('.del');
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

	test('load does not call fetch if max-age allows it', async ({ page, request }) => {
		await request.get('/load/cache-control/reset');

		page.addInitScript(`
			window.now = 0;
			window.performance.now = () => now;
		`);

		await page.goto('/load/cache-control');
		expect(await page.textContent('p')).toBe('Count is 0');
		await page.waitForTimeout(500);
		await page.click('button');
		await page.waitForTimeout(500);
		expect(await page.textContent('p')).toBe('Count is 0');

		await page.evaluate(() => (window.now = 2500));
		await page.click('button');
		await expect(page.locator('p')).toHaveText('Count is 2');
	});

	test('__data.js has cache-control: private, no-store', async ({ page, clicknav }) => {
		await page.goto('/load/server-data-nostore?x=1');

		const [response] = await Promise.all([
			page.waitForResponse((response) => /__data\.js/.test(response.url())),
			clicknav('[href="/load/server-data-nostore?x=2"]')
		]);

		expect(response.headers()['cache-control']).toBe('private, no-store');
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
			expect(await page.textContent('h1')).toBe('42');

			expect(warnings).toContain(
				`Loading http://localhost:${port}/load/window-fetch/data.json using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://kit.svelte.dev/docs/load#input-fetch`
			);

			warnings.length = 0;

			await page.goto('/load/window-fetch/correct');
			expect(await page.textContent('h1')).toBe('42');

			expect(warnings).not.toContain(
				`Loading http://localhost:${port}/load/window-fetch/data.json using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://kit.svelte.dev/docs/load#input-fetch`
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
		await page.click('[href="#target"]');
		expect(await page.textContent('#window-hash')).toBe('#target');
		expect(await page.textContent('#page-url-hash')).toBe('#target');
		await page.click('[href="/routing/hashes/pagestore"]');
		await expect(page.locator('#window-hash')).toHaveText('#target'); // hashchange doesn't fire for these
		await expect(page.locator('#page-url-hash')).toHaveText('');
	});

	test('does not normalize external path', async ({ page }) => {
		const urls = [];

		const { port, close } = await start_server((req, res) => {
			if (req.url !== '/favicon.ico') urls.push(req.url);
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

	test('Can use browser-only global on client-only page through ssr config in layout.js', async ({
		page,
		read_errors
	}) => {
		await page.goto('/no-ssr/ssr-page-config');
		await expect(page.locator('p')).toHaveText('Works');
		expect(read_errors('/no-ssr/ssr-page-config')).toBe(undefined);
	});

	test('Can use browser-only global on client-only page through ssr config in page.js', async ({
		page,
		read_errors
	}) => {
		await page.goto('/no-ssr/ssr-page-config/layout/inherit');
		await expect(page.locator('p')).toHaveText('Works');
		expect(read_errors('/no-ssr/ssr-page-config/layout/inherit')).toBe(undefined);
	});

	test('Cannot use browser-only global on page because of ssr config in page.js', async ({
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
		await page.click('button');
		await expect(page.locator('h1')).toHaveText('/store/client-access');
	});

	test('$page.data does not update if data is unchanged', async ({ page, app }) => {
		await page.goto('/store/data/unchanged/a');
		await app.goto('/store/data/unchanged/b');
		await expect(page.locator('p')).toHaveText('$page.data was updated 0 time(s)');
	});
});

test.describe.serial('Invalidation', () => {
	test('+layout.server.js does not re-run when downstream load functions are invalidated', async ({
		page,
		request,
		clicknav
	}) => {
		await request.get('/load/unchanged/reset');

		await page.goto('/load/unchanged/isolated/a');
		expect(await page.textContent('h1')).toBe('slug: a');
		expect(await page.textContent('h2')).toBe('count: 0');

		await clicknav('[href="/load/unchanged/isolated/b"]');
		expect(await page.textContent('h1')).toBe('slug: b');
		expect(await page.textContent('h2')).toBe('count: 0');
	});

	test('+layout.server.js re-runs when await parent() is called from downstream load function', async ({
		page,
		request,
		clicknav
	}) => {
		await request.get('/load/unchanged/reset');

		await page.goto('/load/unchanged/uses-parent/a');
		expect(await page.textContent('h1')).toBe('slug: a');
		expect(await page.textContent('h2')).toBe('count: 0');
		expect(await page.textContent('h3')).toBe('doubled: 0');

		await clicknav('[href="/load/unchanged/uses-parent/b"]');
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

	test('server-only load functions are re-run following forced invalidation', async ({
		page,
		request
	}) => {
		await request.get('/load/invalidation/forced/reset');

		await page.goto('/load/invalidation/forced');
		expect(await page.textContent('h1')).toBe('a: 0, b: 1');

		await page.click('button');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(200); // apparently necessary
		expect(await page.textContent('h1')).toBe('a: 2, b: 3');

		await page.click('button');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(200);
		expect(await page.textContent('h1')).toBe('a: 4, b: 5');
	});

	test('multiple invalidations run concurrently', async ({ page, request }) => {
		await page.goto('/load/invalidation/multiple');
		expect(await page.textContent('p')).toBe('layout: 0, page: 0');

		await page.click('button.layout');
		await page.click('button.layout');
		await page.click('button.page');
		await page.click('button.page');
		await page.click('button.layout');
		await page.click('button.page');
		await page.click('button.all');
		await expect(page.locator('p')).toHaveText('layout: 4, page: 4');
	});

	test('invalidateAll persists through redirects', async ({ page }) => {
		await page.goto('/load/invalidation/multiple/redirect');
		await page.click('button.redirect');
		await expect(page.locator('p.redirect-state')).toHaveText('Redirect state: done');
	});

	test('+layout(.server).js is re-run when server dep is invalidated', async ({ page }) => {
		await page.goto('/load/invalidation/depends');
		const server = await page.textContent('p.server');
		const shared = await page.textContent('p.shared');
		expect(server).toBeDefined();
		expect(shared).toBeDefined();

		await Promise.all([page.click('button.server'), page.waitForLoadState('networkidle')]);
		await page.waitForTimeout(200);
		const next_server = await page.textContent('p.server');
		const next_shared = await page.textContent('p.shared');
		expect(server).not.toBe(next_server);
		expect(shared).not.toBe(next_shared);
	});

	test('+layout.js is re-run when shared dep is invalidated', async ({ page, clicknav }) => {
		await page.goto('/load/invalidation/depends');
		const server = await page.textContent('p.server');
		const shared = await page.textContent('p.shared');
		expect(server).toBeDefined();
		expect(shared).toBeDefined();

		await Promise.all([page.click('button.shared'), page.waitForLoadState('networkidle')]);
		await page.waitForTimeout(200);
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
});

test.describe('data-sveltekit attributes', () => {
	test('data-sveltekit-prefetch', async ({ baseURL, page }) => {
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		const module = process.env.DEV
			? `${baseURL}/src/routes/data-sveltekit/prefetch/target/+page.svelte`
			: `${baseURL}/_app/immutable/components/pages/data-sveltekit/prefetch/target/_page`;

		await page.goto('/data-sveltekit/prefetch');
		await page.locator('#one').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for prefetching to start
			page.waitForLoadState('networkidle') // wait for prefetching to finish
		]);
		expect(requests.find((r) => r.startsWith(module))).toBeDefined();

		requests.length = 0;
		await page.goto('/data-sveltekit/prefetch');
		await page.locator('#two').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for prefetching to start
			page.waitForLoadState('networkidle') // wait for prefetching to finish
		]);
		expect(requests.find((r) => r.startsWith(module))).toBeDefined();

		requests.length = 0;
		await page.goto('/data-sveltekit/prefetch');
		await page.locator('#three').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for prefetching to start
			page.waitForLoadState('networkidle') // wait for prefetching to finish
		]);
		expect(requests.find((r) => r.startsWith(module))).toBeUndefined();
	});

	test('data-sveltekit-reload', async ({ baseURL, page, clicknav }) => {
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await page.goto('/data-sveltekit/reload');
		await page.click('#one');
		expect(requests).toContain(`${baseURL}/data-sveltekit/reload/target`);

		requests.length = 0;
		await page.goto('/data-sveltekit/reload');
		await page.click('#two');
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
