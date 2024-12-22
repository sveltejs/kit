import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('a11y', () => {
	test('applies autofocus after an enhanced form submit', async ({ page }) => {
		await page.goto('/accessibility/autofocus/b');

		await page.click('#submit');
		await page.waitForFunction(() => document.activeElement?.nodeName === 'INPUT', null, {
			timeout: 1000
		});
	});
});

test.describe('Caching', () => {
	test('caches __data.json requests with invalidated search param', async ({ page, app }) => {
		await page.goto('/');
		const [, response] = await Promise.all([
			app.goto('/caching/server-data'),
			page.waitForResponse((request) =>
				request.url().endsWith('server-data/__data.json?x-sveltekit-invalidated=01')
			)
		]);
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});
});

test.describe('Endpoints', () => {
	test('calls a delete handler', async ({ page }) => {
		await page.goto('/delete-route');
		await page.locator('.del').click();
		expect(await page.innerHTML('h1')).toBe('deleted 42');
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

	if (process.env.DEV) {
		test('accessing url.hash from load errors and suggests using page state', async ({ page }) => {
			await page.goto('/load/url-hash#please-dont-send-me-to-load');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "Cannot access event.url.hash. Consider using `page.url.hash` inside a component instead (500 Internal Error)"'
			);
		});
	}

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

		await page.goto('/load/server-data-reuse/with-changing-parent/with-server-load');
		expect(await page.textContent('pre')).toBe(
			JSON.stringify({
				foo: { bar: 'Custom layout' },
				title: '/load/server-data-reuse/with-changing-parent/with-server-load',
				server: true
			})
		);
		await app.goto('/load/server-data-reuse/with-changing-parent/no-load');
		expect(await page.textContent('pre')).toBe(
			JSON.stringify({
				foo: { bar: 'Custom layout' },
				title: '/load/server-data-reuse/with-changing-parent/no-load'
			})
		);
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
		await page.addInitScript(`
			window.now = 0;
			window.performance.now = () => now;
		`);

		await page.goto('/load/cache-control/default');

		const button = page.locator('button');
		const p = page.locator('p.counter');

		await button.click();
		await expect(button).toHaveAttribute('data-ticker', '2');
		await expect(p).toHaveText('Count is 0');

		await page.evaluate('window.now = 2500');

		await button.click();
		await expect(button).toHaveAttribute('data-ticker', '4');
		await expect(p).toHaveText('Count is 2');
	});

	test('load does ignore ttl if fetch cache options says so', async ({ page }) => {
		await page.goto('/load/cache-control/force');
		const p = page.locator('p.counter');
		await expect(p).toHaveText('Count is 0');
		await page.locator('button').click();
		await expect(p).toHaveText('Count is 1');
	});

	test('load busts cache if non-GET request to resource is made', async ({ page }) => {
		await page.goto('/load/cache-control/bust');
		const p = page.locator('p.counter');
		await expect(p).toHaveText('Count is 0');
		await page.locator('button').click();
		await expect(p).toHaveText('Count is 1');
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

	test('do not use cache if headers are different', async ({ page, clicknav }) => {
		await page.goto('/load/fetch-cache-control/headers-diff');

		// 1. We expect the right data
		expect(await page.textContent('h2')).toBe('a / b');

		// 2. Change to another route (client side)
		await clicknav('[href="/load/fetch-cache-control"]');

		// 3. Come back to the original page (client side)
		const requests = [];
		page.on('request', (request) => requests.push(request));
		await clicknav('[href="/load/fetch-cache-control/headers-diff"]');

		// 4. We expect the same data and no new request because it was cached.
		expect(await page.textContent('h2')).toBe('a / b');
		expect(requests).toEqual([]);
	});

	test('permits 3rd party patching of fetch in universal load functions', async ({ page }) => {
		/** @type {string[]} */
		const logs = [];
		page.on('console', (msg) => {
			if (msg.type() === 'log') {
				logs.push(msg.text());
			}
		});

		await page.goto('/load/window-fetch/patching');
		expect(await page.textContent('h1')).toBe('42');

		expect(logs).toContain('Called a patched window.fetch');
	});

	test('does not repeat fetch on hydration when using Request object', async ({ page }) => {
		const requests = [];
		page.on('request', (request) => {
			if (request.url().includes('/load/fetch-request.json')) {
				requests.push(request);
			}
		});

		await page.goto('/load/fetch-request-empty-headers');

		console.log({ requests });

		expect(requests).toEqual([]);
	});

	if (process.env.DEV) {
		test('using window.fetch causes a warning', async ({ page, baseURL }) => {
			await Promise.all([
				page.goto('/load/window-fetch/incorrect'),
				page.waitForEvent('console', {
					predicate: (message) => {
						return (
							message.text() ===
							`Loading ${baseURL}/load/window-fetch/data.json using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://svelte.dev/docs/kit/load#making-fetch-requests`
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
				`Loading ${baseURL}/load/window-fetch/data.json using \`window.fetch\`. For best results, use the \`fetch\` that is passed to your \`load\` function: https://svelte.dev/docs/kit/load#making-fetch-requests`
			);
		});
	}

	if (!process.env.DEV) {
		test('does not fetch __data.json if no server load function exists', async ({
			page,
			clicknav
		}) => {
			await page.goto('/load/no-server-load/a');

			/** @type {string[]} */
			const pathnames = [];
			page.on('request', (r) => pathnames.push(new URL(r.url()).pathname));
			await clicknav('[href="/load/no-server-load/b"]');

			expect(pathnames).not.toContain('/load/no-server-load/b/__data.json');
		});
	}
});

test.describe('Page options', () => {
	test('applies generated component styles with ssr=false (hides announcer)', async ({
		page,
		clicknav,
		get_computed_style
	}) => {
		await page.goto('/no-ssr');
		await clicknav('[href="/no-ssr/other"]');

		expect(await get_computed_style('#svelte-announcer', 'position')).toBe('absolute');
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
			'This is your custom error page saying: "document is not defined (500 Internal Error)"'
		);
	});
});

// TODO SvelteKit 3: remove these tests
test.describe('$app/stores', () => {
	test('can use $app/stores from anywhere on client', async ({ page }) => {
		await page.goto('/store/client-access');
		await expect(page.locator('h1')).toHaveText('undefined');
		await page.locator('button').click();
		await expect(page.locator('h1')).toHaveText('/store/client-access');
	});

	test('$page.data does not update if data is unchanged', async ({ page, app }) => {
		await page.goto('/store/data/store-update/a');
		await app.goto('/store/data/store-update/b');
		await expect(page.locator('p')).toHaveText('$page.data was updated 0 time(s)');
	});

	test('$page.data does update if keys did not change but data did', async ({ page, app }) => {
		await page.goto('/store/data/store-update/same-keys/same');
		await app.goto('/store/data/store-update/same-keys');
		await expect(page.locator('p')).toHaveText('$page.data was updated 1 time(s)');
	});

	test('$page.data does update if keys did not change but data did (2)', async ({ page, app }) => {
		await page.goto('/store/data/store-update/same-keys/same-deep/nested');
		await app.goto('/store/data/store-update/same-keys');
		await expect(page.locator('p')).toHaveText('$page.data was updated 1 time(s)');
	});
});

test.describe('$app/state', () => {
	test('can use $app/state from anywhere on client', async ({ page }) => {
		await page.goto('/state/client-access');
		await expect(page.locator('h1')).toHaveText('undefined');
		await page.locator('button').click();
		await expect(page.locator('h1')).toHaveText('/state/client-access');
	});

	test('page.data does not update if data is unchanged', async ({ page, app }) => {
		await page.goto('/state/data/state-update/a');
		await app.goto('/state/data/state-update/b');
		await expect(page.locator('p')).toHaveText('page.data was updated 0 time(s)');
	});

	test('page.data does update if keys did not change but data did', async ({ page, app }) => {
		await page.goto('/state/data/state-update/same-keys/same');
		await app.goto('/state/data/state-update/same-keys');
		await expect(page.locator('p')).toHaveText('page.data was updated 1 time(s)');
	});

	test('page.data does update if keys did not change but data did (2)', async ({ page, app }) => {
		await page.goto('/state/data/state-update/same-keys/same-deep/nested');
		await app.goto('/state/data/state-update/same-keys');
		await expect(page.locator('p')).toHaveText('page.data was updated 1 time(s)');
	});

	test('page.url does update when used with goto', async ({ page }) => {
		await page.goto('/state/url');
		await expect(page.locator('p')).toHaveText('undefined');
		await page.locator('button').click();
		await expect(page.locator('p')).toHaveText('test');
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

	test('load function only re-runs when tracked searchParams change (universal)', async ({
		page,
		clicknav
	}) => {
		await page.goto('/load/invalidation/search-params/universal?tracked=0');
		expect(await page.textContent('span')).toBe('count: 0');
		await clicknav('[data-id="tracked"]');
		expect(await page.textContent('span')).toBe('count: 1');
		await clicknav('[data-id="untracked"]');
		expect(await page.textContent('span')).toBe('count: 1');
	});

	test('load function only re-runs when tracked searchParams change (server)', async ({
		page,
		clicknav
	}) => {
		await page.goto('/load/invalidation/search-params/server?tracked=0');
		expect(await page.textContent('span')).toBe('count: 0');
		await clicknav('[data-id="tracked"]');
		expect(await page.textContent('span')).toBe('count: 1');
		await clicknav('[data-id="untracked"]');
		expect(await page.textContent('span')).toBe('count: 1');
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

	test('multiple synchronous invalidations are batched', async ({ page }) => {
		await page.goto('/load/invalidation/multiple-batched');
		const btn = page.locator('#multiple-batched');
		await expect(btn).toHaveText('0');

		await btn.click();
		await expect(btn).toHaveAttribute('data-done', 'true');
		await expect(btn).toHaveText('2');
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

		await page.click('button.neither');
		await page.evaluate(() => window.promise);
		expect(await page.textContent('p.server')).toBe(next_server);
		expect(await page.textContent('p.shared')).toBe(next_shared);
	});

	test('fetch in server load cannot be invalidated', async ({ page, app, request }) => {
		// legacy behavior was to track server dependencies -- this could leak secrets to the client (see github.com/sveltejs/kit/pull/9945)
		// we keep this test just to make sure the behavior stays the same.
		await request.get('/load/invalidation/server-fetch/count.json?reset');
		await page.goto('/load/invalidation/server-fetch');
		const selector = '[data-testid="count"]';

		expect(await page.textContent(selector)).toBe('1');
		await app.invalidate('/load/invalidation/server-fetch/count.json');
		expect(await page.textContent(selector)).toBe('1');
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

		await page.click('button.neither');
		await page.evaluate(() => window.promise);
		expect(await page.textContent('p.server')).toBe(next_server);
		expect(await page.textContent('p.shared')).toBe(next_shared);
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

	test('route.id does not rerun layout if unchanged', async ({ page, clicknav }) => {
		await page.goto('/load/invalidation/route/shared/unchanged-x');
		expect(await page.textContent('h1')).toBe('route.id: /load/invalidation/route/shared/[x]');
		const id = await page.textContent('h2');

		await clicknav('[href="/load/invalidation/route/shared/unchanged-y"]');
		expect(await page.textContent('h1')).toBe('route.id: /load/invalidation/route/shared/[x]');
		expect(await page.textContent('h2')).toBe(id);
	});

	test('page.url can safely be mutated', async ({ page }) => {
		await page.goto('/load/mutated-url?q=initial');
		await expect(page.getByText('initial')).toBeVisible();

		await page.locator('button').click();
		await expect(page.getByText('updated')).toBeVisible();
	});

	test('goto after invalidation does not reset state', async ({ page }) => {
		await page.goto('/load/invalidation/invalidate-then-goto');
		const layout = await page.textContent('p.layout');
		const _page = await page.textContent('p.page');
		expect(layout).toBeDefined();
		expect(_page).toBeDefined();

		await page.click('button.invalidate');
		await page.evaluate(() => window.promise);
		const next_layout_1 = await page.textContent('p.layout');
		const next_page_1 = await page.textContent('p.page');
		expect(next_layout_1).not.toBe(layout);
		expect(next_page_1).toBe(_page);

		await page.click('button.goto');
		await page.evaluate(() => window.promise);
		const next_layout_2 = await page.textContent('p.layout');
		const next_page_2 = await page.textContent('p.page');
		expect(next_layout_2).toBe(next_layout_1);
		expect(next_page_2).not.toBe(next_page_1);
	});
});

test.describe('data-sveltekit attributes', () => {
	test('data-sveltekit-preload-data', async ({ page }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (req) => {
			if (req.resourceType() === 'script') {
				req
					.response()
					.then(
						(res) => res.text(),
						() => ''
					)
					.then((response) => {
						if (response.includes('this string should only appear in this preloaded file')) {
							requests.push(req.url());
						}
					});
			}
		});

		await page.goto('/data-sveltekit/preload-data');
		await page.locator('#one').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);
		expect(requests.length).toBe(1);

		requests.length = 0;
		await page.goto('/data-sveltekit/preload-data');
		await page.locator('#two').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);
		expect(requests.length).toBe(1);

		requests.length = 0;
		await page.goto('/data-sveltekit/preload-data');
		await page.locator('#three').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);
		expect(requests.length).toBe(0);
	});

	test('data-sveltekit-preload-data network failure does not trigger navigation', async ({
		page,
		context,
		browserName
	}) => {
		await page.goto('/data-sveltekit/preload-data/offline');

		await context.setOffline(true);

		await page.locator('#one').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);

		let offline_url = /\/data-sveltekit\/preload-data\/offline/;
		if (browserName === 'chromium') {
			// it's chrome-error://chromewebdata/ on ubuntu but not on windows
			offline_url = /chrome-error:\/\/chromewebdata\/|\/data-sveltekit\/preload-data\/offline/;
		}
		expect(page).toHaveURL(offline_url);
	});

	test('data-sveltekit-preload-data error does not block user navigation', async ({
		page,
		context,
		browserName
	}) => {
		await page.goto('/data-sveltekit/preload-data/offline');

		await context.setOffline(true);

		await page.locator('#one').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);

		expect(page).toHaveURL('/data-sveltekit/preload-data/offline');

		await page.locator('#one').dispatchEvent('click');
		await page.waitForTimeout(100); // wait for navigation to start
		await page.waitForLoadState('networkidle');

		let offline_url = /\/data-sveltekit\/preload-data\/offline/;
		if (browserName === 'chromium') {
			// it's chrome-error://chromewebdata/ on ubuntu but not on windows
			offline_url = /chrome-error:\/\/chromewebdata\/|\/data-sveltekit\/preload-data\/offline/;
		}
		expect(page).toHaveURL(offline_url);
	});

	test('data-sveltekit-preload does not abort ongoing navigation', async ({ page }) => {
		await page.goto('/data-sveltekit/preload-data/offline');

		await page.locator('#slow-navigation').dispatchEvent('click');
		await page.waitForTimeout(100); // wait for navigation to start
		await page.locator('#slow-navigation').dispatchEvent('mousemove');
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);

		expect(page).toHaveURL('/data-sveltekit/preload-data/offline/slow-navigation');
	});

	test('data-sveltekit-reload', async ({ baseURL, page, clicknav }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await page.goto('/data-sveltekit/reload');
		await clicknav('#one');
		expect(requests).toContain(`${baseURL}/data-sveltekit/reload/target`);

		requests.length = 0;
		await page.goto('/data-sveltekit/reload');
		await clicknav('#two');
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

	test('data-sveltekit-replacestate', async ({ page, clicknav }) => {
		await page.goto('/');
		await page.goto('/data-sveltekit/replacestate');
		await clicknav('#one');
		await page.goBack();
		await expect(page).not.toHaveURL(/replacestate/);

		await page.goto('/');
		await page.goto('/data-sveltekit/replacestate');
		await clicknav('#two');
		await page.goBack();
		await expect(page).not.toHaveURL(/replacestate/);

		await page.goto('/');
		await page.goto('/data-sveltekit/replacestate');
		await clicknav('#three');
		await page.goBack();
		await expect(page).toHaveURL(/replacestate$/);
	});
});

test.describe('Content negotiation', () => {
	test('+server.js next to +page.svelte works', async ({ page }) => {
		const response = await page.goto('/routing/content-negotiation');

		expect(response.headers()['vary']).toBe('Accept');
		expect(await page.textContent('p')).toBe('Hi');

		const pre = page.locator('pre');
		for (const method of ['GET', 'PUT', 'PATCH', 'POST', 'DELETE']) {
			await page.click(`button:has-text("${method}")`);
			await expect(pre).toHaveText(method);
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

test.describe('env', () => {
	test('can access public env in app.html', async ({ page }) => {
		await page.goto('/');
		expect(await page.locator('body').getAttribute('class')).toContain('groovy');
	});

	test('can access public env in hooks.client.js', async ({ page }) => {
		await page.goto('/');
		expect(await page.evaluate(() => window.PUBLIC_DYNAMIC)).toBe(
			'accessible anywhere/evaluated at run time'
		);
	});

	test('uses correct dynamic env when navigating from prerendered page', async ({
		page,
		clicknav
	}) => {
		await page.goto('/prerendering/env/prerendered');
		await clicknav('[href="/prerendering/env/dynamic"]');
		expect(await page.locator('h2')).toHaveText('prerendering: false');
	});
});

test.describe('Snapshots', () => {
	test('recovers snapshotted data', async ({ page, clicknav }) => {
		await page.goto('/snapshot/a');

		let input = page.locator('input');
		await input.type('hello');

		await clicknav('[href="/snapshot/b"]');
		await page.goBack();

		input = page.locator('input');
		expect(await input.inputValue()).toBe('hello');

		await input.clear();
		await input.type('works for cross-document navigations');

		await clicknav('[href="/snapshot/c"]');
		await page.goBack();
		expect(await page.locator('input').inputValue()).toBe('works for cross-document navigations');

		input = page.locator('input');
		await input.clear();
		await input.type('works for reloads');

		await page.reload();
		expect(await page.locator('input').inputValue()).toBe('works for reloads');
	});
});

test.describe('Streaming', () => {
	test('Works for universal load functions (client nav)', async ({ page }) => {
		await page.goto('/streaming');
		page.click('[href="/streaming/universal"]');

		await expect(page.locator('p.eager')).toHaveText('eager');
		expect(page.locator('p.loadingsuccess')).toBeVisible();
		expect(page.locator('p.loadingfail')).toBeVisible();

		await expect(page.locator('p.success')).toHaveText('success');
		await expect(page.locator('p.fail')).toHaveText('fail');
		expect(page.locator('p.loadingsuccess')).toBeHidden();
		expect(page.locator('p.loadingfail')).toBeHidden();
	});

	test('Works for server load functions (client nav)', async ({ page }) => {
		await page.goto('/streaming');
		page.click('[href="/streaming/server"]');

		await expect(page.locator('p.eager')).toHaveText('eager');
		expect(page.locator('p.loadingsuccess')).toBeVisible();
		expect(page.locator('p.loadingfail')).toBeVisible();

		await expect(page.locator('p.success', { timeout: 15000 })).toHaveText('success');
		await expect(page.locator('p.fail', { timeout: 15000 })).toHaveText(
			'fail (500 Internal Error)'
		);
		expect(page.locator('p.loadingsuccess')).toBeHidden();
		expect(page.locator('p.loadingfail')).toBeHidden();
	});

	test('Catches fetch errors from server load functions (client nav)', async ({ page }) => {
		await page.goto('/streaming');
		page.click('[href="/streaming/server-error"]');

		await expect(page.locator('p.eager')).toHaveText('eager');
		expect(page.locator('p.fail')).toBeVisible();
	});

	// TODO `vite preview` buffers responses, causing these tests to fail
	if (process.env.DEV) {
		test('Works for universal load functions (direct hit)', async ({ page }) => {
			page.goto('/streaming/universal');

			// Write first assertion like this to control the retry interval. Else it might happen that
			// the test fails because the next retry is too late (probably uses a back-off strategy)
			await expect(async () => {
				expect(await page.locator('p.eager').textContent()).toBe('eager');
			}).toPass({
				intervals: [100]
			});

			expect(page.locator('p.loadingsuccess')).toBeVisible();
			expect(page.locator('p.loadingfail')).toBeVisible();

			await expect(page.locator('p.success')).toHaveText('success');
			await expect(page.locator('p.fail')).toHaveText('fail');
			expect(page.locator('p.loadingsuccess')).toBeHidden();
			expect(page.locator('p.loadingfail')).toBeHidden();
		});

		test('Works for server load functions (direct hit)', async ({ page }) => {
			page.goto('/streaming/server');

			// Write first assertion like this to control the retry interval. Else it might happen that
			// the test fails because the next retry is too late (probably uses a back-off strategy)
			await expect(async () => {
				expect(await page.locator('p.eager').textContent()).toBe('eager');
			}).toPass({
				intervals: [100]
			});

			expect(page.locator('p.loadingsuccess')).toBeVisible();
			expect(page.locator('p.loadingfail')).toBeVisible();

			await expect(page.locator('p.success')).toHaveText('success');
			await expect(page.locator('p.fail')).toHaveText('fail (500 Internal Error)');
			expect(page.locator('p.loadingsuccess')).toBeHidden();
			expect(page.locator('p.loadingfail')).toBeHidden();
		});

		test('Catches fetch errors from server load functions (direct hit)', async ({ page }) => {
			page.goto('/streaming/server-error');
			await expect(page.locator('p.eager')).toHaveText('eager');
			await expect(page.locator('p.fail')).toHaveText('fail');
		});
	}
});

test.describe('Actions', () => {
	test('page state has correct data', async ({ page }) => {
		await page.goto('/actions/enhance');
		const pre = page.locator('pre.data1');

		await expect(pre).toHaveText('prop: 0, state: 0');
		await page.locator('.form4').click();
		await expect(pre).toHaveText('prop: 1, state: 1');
		await page.evaluate('window.svelte_tick()');
		await expect(pre).toHaveText('prop: 1, state: 1');
	});
});

test.describe('Assets', () => {
	test('only one link per stylesheet', async ({ page }) => {
		if (process.env.DEV) return;

		await page.goto('/');

		expect(
			await page.evaluate(() => {
				const links = Array.from(document.head.querySelectorAll('link[rel=stylesheet]'));

				for (let i = 0; i < links.length; ) {
					const link = links.shift();
					const asset_name = link.href.split('/').at(-1);
					if (links.some((link) => link.href.includes(asset_name))) {
						return false;
					}
				}

				return true;
			})
		).toBe(true);
	});
});

test.describe('goto', () => {
	test('goto fails with external URL', async ({ page }) => {
		await page.goto('/goto');
		await page.click('button');

		const message = process.env.DEV
			? 'Cannot use `goto` with an external URL. Use `window.location = "https://example.com/"` instead'
			: 'goto: invalid URL';
		await expect(page.locator('p')).toHaveText(message);
	});
});

test.describe('untrack', () => {
	test('untracks server load function', async ({ page, clicknav }) => {
		await page.goto('/untrack/server/1');
		expect(await page.textContent('p.url')).toBe('/untrack/server/1');
		const id = await page.textContent('p.id');
		await clicknav('a[href="/untrack/server/2"]');
		expect(await page.textContent('p.url')).toBe('/untrack/server/2');
		expect(await page.textContent('p.id')).toBe(id);
	});

	test('untracks universal load function', async ({ page, clicknav }) => {
		await page.goto('/untrack/universal/1');
		expect(await page.textContent('p.url')).toBe('/untrack/universal/1');
		const id = await page.textContent('p.id');
		await clicknav('a[href="/untrack/universal/2"]');
		expect(await page.textContent('p.url')).toBe('/untrack/universal/2');
		expect(await page.textContent('p.id')).toBe(id);
	});
});

test.describe('Shallow routing', () => {
	test('Pushes state to the current URL', async ({ page }) => {
		await page.goto('/shallow-routing/push-state');
		await expect(page.locator('p')).toHaveText('active: false');

		await page.locator('[data-id="one"]').click();
		await expect(page.locator('p')).toHaveText('active: true');

		await page.goBack();
		await expect(page.locator('p')).toHaveText('active: false');
	});

	test('Pushes state to a new URL', async ({ baseURL, page }) => {
		await page.goto('/shallow-routing/push-state');
		await expect(page.locator('p')).toHaveText('active: false');

		await page.locator('[data-id="two"]').click();
		expect(page.url()).toBe(`${baseURL}/shallow-routing/push-state/a`);
		await expect(page.locator('h1')).toHaveText('parent');
		await expect(page.locator('p')).toHaveText('active: true');

		await page.reload();
		await expect(page.locator('h1')).toHaveText('a');
		await expect(page.locator('p')).toHaveText('active: false');

		await page.goBack();
		expect(page.url()).toBe(`${baseURL}/shallow-routing/push-state`);
		await expect(page.locator('h1')).toHaveText('parent');
		await expect(page.locator('p')).toHaveText('active: false');

		await page.goForward();
		expect(page.url()).toBe(`${baseURL}/shallow-routing/push-state/a`);
		await expect(page.locator('h1')).toHaveText('parent');
		await expect(page.locator('p')).toHaveText('active: true');
	});

	test('Invalidates the correct route after pushing state to a new URL', async ({
		baseURL,
		page
	}) => {
		await page.goto('/shallow-routing/push-state');
		await expect(page.locator('p')).toHaveText('active: false');

		const now = await page.locator('span').textContent();

		await page.locator('[data-id="two"]').click();
		expect(page.url()).toBe(`${baseURL}/shallow-routing/push-state/a`);

		await page.locator('[data-id="invalidate"]').click();
		await expect(page.locator('h1')).toHaveText('parent');
		await expect(page.locator('span')).not.toHaveText(now);
	});

	test('Does not navigate when going back to shallow route', async ({ baseURL, page }) => {
		await page.goto('/shallow-routing/push-state');
		await page.locator('[data-id="two"]').click();
		await page.goBack();
		await page.goForward();

		expect(page.url()).toBe(`${baseURL}/shallow-routing/push-state/a`);
		await expect(page.locator('h1')).toHaveText('parent');
		await expect(page.locator('p')).toHaveText('active: true');
	});

	test('Replaces state on the current URL', async ({ baseURL, page, clicknav }) => {
		await page.goto('/shallow-routing/replace-state/b');
		await clicknav('[href="/shallow-routing/replace-state"]');

		await page.locator('[data-id="one"]').click();
		await expect(page.locator('p')).toHaveText('active: true');

		await page.goBack();
		expect(page.url()).toBe(`${baseURL}/shallow-routing/replace-state/b`);
		await expect(page.locator('h1')).toHaveText('b');

		await page.goForward();
		expect(page.url()).toBe(`${baseURL}/shallow-routing/replace-state`);
		await expect(page.locator('h1')).toHaveText('parent');
		await expect(page.locator('p')).toHaveText('active: true');
	});

	test('Replaces state on a new URL', async ({ baseURL, page, clicknav }) => {
		await page.goto('/shallow-routing/replace-state/b');
		await clicknav('[href="/shallow-routing/replace-state"]');

		await page.locator('[data-id="two"]').click();
		await expect(page.locator('p')).toHaveText('active: true');

		await page.goBack();
		expect(page.url()).toBe(`${baseURL}/shallow-routing/replace-state/b`);
		await expect(page.locator('h1')).toHaveText('b');

		await page.goForward();
		expect(page.url()).toBe(`${baseURL}/shallow-routing/replace-state/a`);
		await expect(page.locator('h1')).toHaveText('parent');
		await expect(page.locator('p')).toHaveText('active: true');
	});
});

test.describe('reroute', () => {
	test('Apply reroute during client side navigation', async ({ page }) => {
		await page.goto('/reroute/basic');
		await page.click("a[href='/reroute/basic/a']");
		expect(await page.textContent('h1')).toContain(
			'Successfully rewritten, URL should still show a: /reroute/basic/a'
		);
	});

	test('Apply reroute after client-only redirects', async ({ page }) => {
		await page.goto('/reroute/client-only-redirect');
		expect(await page.textContent('h1')).toContain('Successfully rewritten');
	});

	test('Apply reroute to preload data', async ({ page }) => {
		await page.goto('/reroute/preload-data');
		await page.click('button');
		await page.waitForSelector('pre');
		expect(await page.textContent('pre')).toContain('"success": true');
	});

	test('reroute does not get applied to external URLs', async ({ page }) => {
		await page.goto('/reroute/external');
		const current_url = new URL(page.url());

		//click the link with the text External URL
		await page.click("a[data-test='external-url']");

		//The URl should not have the same origin as the current URL
		const new_url = new URL(page.url());
		expect(current_url.origin).not.toEqual(new_url.origin);
	});

	test('Falls back to native navigation if reroute throws on the client', async ({ page }) => {
		await page.goto('/reroute/error-handling');

		//click the link with the text External URL
		await page.click('a#client-error');

		expect(await page.textContent('h1')).toContain('Full Navigation');
	});
});

test.describe('init', () => {
	test('init client hook is called once when the application start on the client', async ({
		page
	}) => {
		/**
		 * @type string[]
		 */
		const logs = [];
		page.addListener('console', (message) => {
			if (message.type() === 'log') {
				logs.push(message.text());
			}
		});
		const log_event = page.waitForEvent('console');
		await page.goto('/init-hooks');
		await log_event;
		expect(logs).toStrictEqual(['init hooks.client.js']);
		await page.getByRole('link').first().click();
		await page.waitForLoadState('load');
		expect(logs).toStrictEqual(['init hooks.client.js']);
	});
});

test.describe('INP', () => {
	test('does not block next paint', async ({ page }) => {
		// Thanks to https://publishing-project.rivendellweb.net/measuring-performance-tasks-with-playwright/#interaction-to-next-paint-inp
		async function measureInteractionToPaint(selector) {
			return page.evaluate(async (selector) => {
				return new Promise((resolve) => {
					const startTime = performance.now();
					document.querySelector(selector).click();
					requestAnimationFrame(() => {
						const endTime = performance.now();
						resolve(endTime - startTime);
					});
				});
			}, selector);
		}

		await page.goto('/routing');

		const client = await page.context().newCDPSession(page);
		await client.send('Emulation.setCPUThrottlingRate', { rate: 100 });

		const time = await measureInteractionToPaint('a[href="/routing/next-paint"]');

		// we may need to tweak this number, and the `rate` above,
		// depending on if this proves flaky
		expect(time).toBeLessThan(400);
	});
});

test.describe('binding_property_non_reactive warn', () => {
	test('warning is not thrown from the root of svelte', async ({ page }) => {
		let is_warning_thrown = false;
		page.on('console', (m) => {
			if (
				m.type() === 'warn' &&
				m.text().includes('binding_property_non_reactive `bind:this={components[0]}`')
			) {
				is_warning_thrown = true;
			}
		});
		await page.goto('/');
		expect(is_warning_thrown).toBeFalsy();
	});
});
