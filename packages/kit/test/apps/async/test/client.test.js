import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe('remote functions', () => {
	test('preloading data works when the page component and server load both import a remote function', async ({
		page,
		clicknav
	}) => {
		test.skip(!process.env.DEV, 'remote functions are only analysed in dev mode');
		await page.goto('/remote/dev');
		await page.locator('a[href="/remote/dev/preload"]').hover();
		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);
		await clicknav('a[href="/remote/dev/preload"]', { waitForURL: '/remote/dev/preload' });
		await expect(page.locator('p')).toHaveText('foobar');
		await page.getByRole('button', { name: 'Refresh' }).click();
		await expect(page.locator('p')).toHaveText('foobaz');
	});

	test('remote query responses are not cacheable', async ({ page }) => {
		// the query is kicked off during SSR but fetched by the client after
		// hydration, so we can observe the response headers on the wire
		const response_promise = page.waitForResponse((r) => r.url().includes('/_app/remote/'));
		await page.goto('/remote/query-loading-state');
		const response = await response_promise;
		expect(response.headers()['cache-control']).toBe('private, no-store');
	});

	test('clicking a link to the current page refreshes active queries', async ({ page }) => {
		await page.goto('/remote/link-refresh');
		await page.locator('#reset').click();

		const a = page.locator('#count');

		await expect(a).toHaveText('0');

		await page.locator('#increment').click();
		await expect(a).toHaveText('0');

		await a.click();
		await expect(a).toHaveText('1');
	});

	test('packages can re-export remote functions', async ({ page }) => {
		await page.goto('/remote-lib');
		await expect(page.locator('h1')).toHaveText('lib says hello');
		await page.getByRole('button', { name: 'call remote function' }).click();
		await expect(page.locator('p')).toHaveText('lib says client');
	});

	test('packages can contain ordinary remote.js files', async ({ page }) => {
		await page.goto('/plain-lib');
		await expect(page.locator('p')).toHaveText('key set for https://example.com/jwks');
	});

	// https://github.com/sveltejs/kit/issues/16854
	//
	// Deriveds downstream of an awaited query lost their memoization and were recomputed
	// on every read, which is exponential in the depth of the graph. The fixture's graph
	// is seven levels deep and costs fourteen recomputations when memoization holds, and
	// tens of thousands when it doesn't; a real charting library's graph is deep enough
	// that the tab never recovers.
	//
	// The bound is deliberately counted rather than timed, so a regression fails in
	// milliseconds instead of hanging until the test times out.
	const RECOMPUTATION_LIMIT = 1000;

	/** @param {import('@playwright/test').Page} page */
	const recomputations = (page) =>
		page.evaluate(
			() => /** @type {Record<string, number>} */ (/** @type {unknown} */ (window)).__recomputations
		);

	test('deriveds fed by an awaited promise are memoized', async ({ page }) => {
		await page.goto('/remote/query-derived-memoization');
		await page.getByRole('radio', { name: 'promise' }).check();
		await expect(page.locator('#result')).toHaveText('10');

		await page.evaluate(() => {
			/** @type {Record<string, number>} */ (/** @type {unknown} */ (window)).__recomputations = 0;
		});
		await page.locator('#bump').click();

		// the graph must actually re-render, or the control tests nothing
		await expect(page.locator('#result')).toHaveText('11');
		expect(await recomputations(page)).toBeLessThan(RECOMPUTATION_LIMIT);
	});

	test('deriveds fed by an awaited query are memoized', async ({ page }) => {
		await page.goto('/remote/query-derived-memoization');
		await expect(page.locator('#result')).toHaveText('10');

		await page.evaluate(() => {
			/** @type {Record<string, number>} */ (/** @type {unknown} */ (window)).__recomputations = 0;
		});
		await page.locator('#bump').click();

		await expect(page.locator('#result')).toHaveText('11');
		expect(await recomputations(page)).toBeLessThan(RECOMPUTATION_LIMIT);
	});
});

// have to run in serial because commands mutate in-memory data on the server (should fix this at some point)
test.describe('remote function mutations', () => {
	test.describe.configure({ mode: 'serial' });

	test.afterEach(async ({ page }) => {
		if (page.url().endsWith('/remote')) {
			await page.click('#reset-btn');
			await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');
		}
	});

	test('query.set works', async ({ page }) => {
		await page.goto('/remote');
		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#set-btn');
		await expect(page.locator('#count-result')).toHaveText('999 / 999 (false)');
		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
		expect(request_count).toBe(0);
	});

	test('hydrated data is reused', async ({ page }) => {
		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');
		// only the calls in the template are done, not the one in the load function
		expect(request_count).toBe(0);
	});

	test('hydrated prerender data is reused', async ({ page }) => {
		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.goto('/remote/prerender-inline');
		await expect(page.locator('#prerender-value')).toHaveText('prerendered: hello');
		await page.waitForTimeout(100); // allow all requests to finish
		expect(request_count).toBe(0);
	});

	test('hydrated batch data is reused', async ({ page }) => {
		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.goto('/remote/batch-ssr');
		await expect(page.locator('#ssr-batch-result-1')).toHaveText('Buy groceries');
		await expect(page.locator('#ssr-batch-result-2')).toHaveText('Walk the dog');
		await expect(page.locator('#ssr-batch-result-3')).toHaveText('Not found');
		expect(request_count).toBe(0);
	});

	test('query.set from within a query during SSR inlines the set values', async ({ page }) => {
		await page.goto('/remote/query-set-inline');

		// start counting after navigation, so we only observe requests triggered by
		// creating the `get_thing(id)` resources — they should reuse the inlined values
		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#show');
		await expect(page.locator('#thing-1')).toHaveText('one');
		await expect(page.locator('#thing-2')).toHaveText('two');
		await expect(page.locator('#thing-3')).toHaveText('three');
		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
		expect(request_count).toBe(0);
	});

	test('query.refresh from within a query during SSR inlines the refreshed values', async ({
		page
	}) => {
		await page.goto('/remote/query-set-inline/refresh');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#show');
		await expect(page.locator('#thing-1')).toHaveText('one');
		await expect(page.locator('#thing-2')).toHaveText('two');
		await expect(page.locator('#thing-3')).toHaveText('three');
		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
		expect(request_count).toBe(0);
	});

	test('a lazily-run refreshed query that refreshes another is included in the single-flight response', async ({
		page
	}) => {
		await page.goto('/remote/nested-refresh');
		await expect(page.locator('#a')).toHaveText('0');
		await expect(page.locator('#b')).toHaveText('0');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		// `bump` refreshes `get_a`; when `get_a` runs on the server it refreshes
		// `get_b`, which is added to the single-flight set mid-collection. Both must
		// come back in the command response, so `#b` updates without an extra request.
		await page.click('#bump');
		await expect(page.locator('#a')).toHaveText('5');
		await expect(page.locator('#b')).toHaveText('50');
		await page.waitForTimeout(100); // allow all requests to finish
		expect(request_count).toBe(1); // only the command itself — no separate refetch of get_b
	});

	test('a query re-refreshed by another query during collection is cached, not re-run', async ({
		page
	}) => {
		await page.goto('/remote/re-refresh');
		await expect(page.locator('#value')).toHaveText('0');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		// `bump` refreshes `get_value` (which sees 10) and `driver`. When `driver`
		// runs during collection it bumps the value to 11 and re-refreshes `get_value`.
		// `get_value` has already been processed once this drain, so the re-refresh is
		// cached rather than re-run — the client keeps the first (10) value. This is
		// what prevents A → B → A refresh cycles from looping forever.
		await page.click('#bump');
		await expect(page.locator('#value')).toHaveText('10');
		await page.waitForTimeout(100); // allow all requests to finish
		expect(request_count).toBe(1); // only the command — no separate refetch
	});

	test('queries that refresh each other in a cycle do not loop forever', async ({ page }) => {
		await page.goto('/remote/refresh-cycle');
		await expect(page.locator('#value')).toHaveText('0');

		// `get_a` refreshes `get_b` and `get_b` refreshes `get_a`. Without cycle
		// detection in the drain phase the command response would never settle, so
		// `#value` would stay at 0 and this assertion would time out.
		await page.click('#bump');

		await expect(page.locator('#value')).toHaveText('1');
	});

	test('hydrated query errors are reused', async ({ page }) => {
		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.goto('/remote/error-hydration');
		await expect(page.locator('#q-error')).toHaveText('418: teapot');
		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
		expect(request_count).toBe(0);
	});

	test('hydrated batch query errors are reused', async ({ page }) => {
		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.goto('/remote/error-hydration/batch');
		await expect(page.locator('#batch-error')).toHaveText('418: batch teapot');
		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
		expect(request_count).toBe(0);
	});

	test('hydrated query.live errors are reused', async ({ page }) => {
		await page.goto(`/remote/live-error-seed/${Date.now()}${Math.random()}`);

		// the SSR HTML shows no error (server-side getters are static), but the
		// hydrated client must seed the failed state from the payload — the
		// reconnection attempt never settles, so this is the only way the error can appear
		await expect(page.locator('#live-error')).toHaveText('418: live teapot');
	});

	test('server-initiated updates for inactive queries are reused when the resource is created', async ({
		page
	}) => {
		await page.goto(`/remote/sidechannel-store/${Date.now()}${Math.random()}`);

		await page.click('#update');
		await page.waitForTimeout(100); // allow the command roundtrip to finish

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#show');
		await expect(page.locator('#value')).toHaveText('updated');
		await page.waitForTimeout(100); // allow all requests to finish (there shouldn't be any)
		expect(request_count).toBe(0);
	});

	test('over-limit requested() refreshes fail the client query', async ({ page }) => {
		await page.goto(`/remote/requested-limit/${Date.now()}${Math.random()}`);

		await expect(page.locator('#value')).toHaveText('0');
		await expect(page.locator('#error')).toHaveText('none');

		await page.click('button');

		await expect(page.locator('#error')).toHaveText(
			'400: Requested refresh was rejected because it exceeded requested(get_count, 0) limit'
		);
	});

	test('command returns correct sum but does not refresh data by default', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-btn');
		await expect(page.locator('#command-result')).toHaveText('2');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');
		await page.waitForTimeout(100); // allow all requests to finish
		expect(request_count).toBe(1); // 1 for the command, no refreshes
	});

	test('command returns correct sum and does requested single flight mutation', async ({
		page
	}) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-refresh-btn');
		await expect(page.locator('#command-result')).toHaveText('3');
		await expect(page.locator('#count-result')).toHaveText('3 / 3 (false)');
		await page.waitForTimeout(100); // allow all requests to finish
		expect(request_count).toBe(1); // no query refreshes, since that happens as part of the command response
	});

	test('command does server-initiated single flight mutation (refresh)', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-server-refresh-btn');
		await expect(page.locator('#command-result')).toHaveText('4');
		await expect(page.locator('#count-result')).toHaveText('4 / 4 (false)');
		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
		expect(request_count).toBe(1); // no query refreshes, since that happens as part of the command response
	});

	test('command refresh after reading query reruns the query', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-server-refresh-after-read-btn');
		await expect(page.locator('#command-result')).toHaveText('6');
		await expect(page.locator('#count-result')).toHaveText('6 / 6 (false)');
		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
		expect(request_count).toBe(1);
	});

	test('command refresh before mutation defers the query until after the mutation', async ({
		page
	}) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-server-refresh-before-mutation-btn');
		await expect(page.locator('#command-result')).toHaveText('12');
		await expect(page.locator('#count-result')).toHaveText('12 / 12 (false)');
		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
		expect(request_count).toBe(1);
	});

	test('command refresh then re-await uses the fresh cache entry', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-server-refresh-then-reawait-btn');
		await expect(page.locator('#command-result')).toHaveText('13');
		await expect(page.locator('#count-result')).toHaveText('13 / 13 (false)');
		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
		expect(request_count).toBe(1);
	});

	test('command does server-initiated single flight mutation (set)', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-server-set-btn');
		await expect(page.locator('#command-result')).toHaveText('8');
		await expect(page.locator('#count-result')).toHaveText('8 / 8 (false)');
		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
		expect(request_count).toBe(1); // no query refreshes, since that happens as part of the command response
	});

	test('command does requested single flight mutation with override', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-override-refresh-btn');
		await expect(page.locator('#count-result')).toHaveText('6 / 6 (false)');
		await expect(page.locator('#command-result')).toHaveText('5');
		await expect(page.locator('#count-result')).toHaveText('5 / 5 (false)');
		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
		expect(request_count).toBe(1); // no query refreshes, since that happens as part of the command response
	});

	test('query refresh errors are isolated to the failing query', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#flaky-ok-result')).toHaveText('ok:0');
		await expect(page.locator('#flaky-fail-result')).toHaveText('fail:0');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-partial-refresh-btn');
		await expect(page.locator('#command-result')).toHaveText('9');
		await expect(page.locator('#flaky-ok-result')).toHaveText('ok:9');
		await expect(page.locator('#flaky-fail-result')).toContainText('flaky refresh failed');
		await page.waitForTimeout(100);
		expect(request_count).toBe(1);
	});

	test('requested(...).refreshAll refreshes tracked query instances', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-refresh-all-btn');
		await expect(page.locator('#command-result')).toHaveText('10');
		await expect(page.locator('#count-result')).toHaveText('10 / 10 (false)');
		await page.waitForTimeout(100);
		expect(request_count).toBe(1);
	});

	test('requested(...).refreshAll isolates failures to failing query', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#flaky-ok-result')).toHaveText('ok:0');
		await expect(page.locator('#flaky-fail-result')).toHaveText('fail:0');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#multiply-partial-refresh-all-btn');
		await expect(page.locator('#command-result')).toHaveText('11');
		await expect(page.locator('#flaky-ok-result')).toHaveText('ok:11');
		await expect(page.locator('#flaky-fail-result')).toContainText('flaky refresh failed');
		await page.waitForTimeout(100);
		expect(request_count).toBe(1);
	});

	test('query/command inside endpoint works', async ({ page }) => {
		await page.goto('/remote/server-endpoint');

		await page.getByRole('button', { name: 'get' }).click();
		await expect(page.locator('p')).toHaveText('get');

		await page.getByRole('button', { name: 'post' }).click();
		await expect(page.locator('p')).toHaveText('post');
	});

	test('command inside form action works', async ({ page }) => {
		await page.goto('/remote/server-action');

		await page.getByRole('button', { name: 'submit' }).click();
		await expect(page.locator('#result')).toHaveText('action: hello');
	});

	test('command inside handle hook works with POST', async ({ request, baseURL }) => {
		const response = await request.post('/remote/hook-command', { headers: { origin: baseURL } });
		expect(response.status()).toBe(200);
		const data = await response.json();
		expect(data.result).toBe('action: from-hook');
	});

	test('command is blocked inside load functions', async ({ page }) => {
		const response = await page.goto('/remote/server-load-command');
		expect(response?.status()).toBe(500);
		await expect(page.locator('#message')).toContainText('Cannot call a command');
	});

	test('command is blocked inside handle hook with GET', async ({ request }) => {
		const response = await request.get('/remote/hook-command');
		expect(response.status()).toBe(500);
		const data = await response.json();
		expect(data.error).toContain('Cannot call a command');
	});

	test('prerendered entries use prerender cache while live entries refetch', async ({ page }) => {
		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
		await page.goto('/remote/prerender');

		await page.click('#fetch-prerendered');
		await expect(page.locator('#fetch-prerendered')).toHaveText('yes');
		expect(request_count).toBe(1);

		await page.click('#fetch-prerendered');
		await expect(page.locator('#fetch-prerendered')).toHaveText('yes');
		expect(request_count).toBe(1);

		await page.click('#fetch-not-prerendered');
		await expect(page.locator('#fetch-not-prerendered')).toHaveText('d');
		expect(request_count).toBe(2);
	});

	test('refreshAll reloads remote functions and load functions', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#refresh-all');
		await page.waitForTimeout(100); // allow things to rerun
		expect(request_count).toBe(5);
	});

	test('command tracks pending state', async ({ page }) => {
		await page.goto('/remote');

		// Initial pending should be 0
		await expect(page.locator('#command-pending')).toHaveText('Command pending: 0');

		// Start a slow command - this will hang until we resolve it
		await page.click('#command-deferred-btn');

		// Check that pending has incremented to 1
		await expect(page.locator('#command-pending')).toHaveText('Command pending: 1');

		// Resolve the deferred command
		await page.click('#resolve-deferreds');

		// Wait for the command to complete and pending to go back to 0
		await expect(page.locator('#command-pending')).toHaveText('Command pending: 0');
	});

	test('validation works', async ({ page }) => {
		await page.goto('/remote/validation');
		await expect(page.locator('p')).toHaveText('pending');

		await page.click('button:nth-of-type(1)');
		await expect(page.locator('p')).toHaveText('success');

		await page.click('button:nth-of-type(2)');
		await expect(page.locator('p')).toHaveText('success');

		await page.click('button:nth-of-type(3)');
		await expect(page.locator('p')).toHaveText('success');

		await page.click('button:nth-of-type(4)');
		await expect(page.locator('p')).toHaveText('success');
	});

	test('reserved words can be used as remote function export names', async ({ page }) => {
		await page.goto('/remote/reserved');
		await expect(page.locator('#reserved-result')).toHaveText('pending');

		await page.click('#reserved-run');
		await expect(page.locator('#reserved-result')).toHaveText('deleted/classy/42');
	});

	test('fields.set updates DOM before validate', async ({ page }) => {
		await page.goto('/remote/form/imperative');

		const input = page.locator('input[name^="message"]');
		await input.fill('123');

		await page.locator('#set-and-validate').click();

		await expect(input).toHaveValue('hello');
		await expect(page.locator('#issue')).toHaveText('ok');
	});

	test('command pending state is tracked correctly', async ({ page }) => {
		await page.goto('/remote');

		// Initially no pending commands
		await expect(page.locator('#command-pending')).toHaveText('Command pending: 0');

		// Start a slow command - this will hang until we resolve it
		await page.click('#command-deferred-btn');

		// Check that pending has incremented to 1
		await expect(page.locator('#command-pending')).toHaveText('Command pending: 1');

		// Resolve the deferred command
		await page.click('#resolve-deferreds');

		// Wait for the command to complete and verify results
		await expect(page.locator('#command-result')).toHaveText('7');

		// Verify pending count returns to 0
		await expect(page.locator('#command-pending')).toHaveText('Command pending: 0');
	});

	test('form pending resets when enhance callback skips submit', async ({ page }) => {
		await page.goto('/remote/form/skip-submit');

		await expect(page.locator('[data-pending]')).toHaveText('0');
		await page.click('button');

		// pending goes to 1 but then back to 0 once enhance finish runs without invoking submit()
		await expect(page.locator('[data-pending]')).toHaveText('0, 1, 0');

		await page.locator('[data-should-submit]').check();

		await page.click('button');

		await expect(page.locator('[data-pending]')).toHaveText('0, 1, 0, 1, 0');
	});

	// TODO once we have async SSR adjust the test and move this into test.js
	test('query.batch works', async ({ page }) => {
		await page.goto('/remote/batch');

		await expect(page.locator('#batch-result-1')).toHaveText('Buy groceries');
		await expect(page.locator('#batch-result-2')).toHaveText('Walk the dog');
		await expect(page.locator('#batch-result-3')).toHaveText('Buy groceries');
		await expect(page.locator('#batch-result-4')).toHaveText('Error loading todo error: Not found');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('button');
		await page.waitForTimeout(100); // allow all requests to finish
		expect(request_count).toBe(1);
	});

	test('query.batch set updates cache without extra request', async ({ page }) => {
		await page.goto('/remote/batch');
		await page.click('#batch-reset-btn');
		await expect(page.locator('#batch-result-1')).toHaveText('Buy groceries');

		let request_count = 0;
		/** @param {import('@playwright/test').Request} r */
		const handler = (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0);
		page.on('request', handler);

		await page.click('#batch-set-btn');
		await expect(page.locator('#batch-result-1')).toHaveText('Buy cat food');
		await page.waitForTimeout(100); // allow all requests to finish
		expect(request_count).toBe(1); // only the command request
	});

	test('query.batch refresh in command reuses single flight', async ({ page }) => {
		await page.goto('/remote/batch');
		await page.click('#batch-reset-btn');
		await expect(page.locator('#batch-result-2')).toHaveText('Walk the dog');

		let request_count = 0;
		/** @param {import('@playwright/test').Request} r */
		const handler = (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0);
		page.on('request', handler);

		await page.click('#batch-refresh-btn');
		await expect(page.locator('#batch-result-2')).toHaveText('Walk the dog (refreshed)');
		await page.waitForTimeout(100); // allow all requests to finish
		expect(request_count).toBe(1); // only the command request
	});

	test('query.batch refresh via requested(...) reuses single batched flight', async ({ page }) => {
		await page.goto('/remote/batch');
		await page.click('#batch-reset-btn');
		await expect(page.locator('#batch-result-1')).toHaveText('Buy groceries');
		await expect(page.locator('#batch-result-2')).toHaveText('Walk the dog');

		let request_count = 0;
		/** @param {import('@playwright/test').Request} r */
		const handler = (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0);
		page.on('request', handler);

		await page.click('#batch-requested-refresh-all-btn');
		await expect(page.locator('#batch-result-1')).toHaveText('Buy groceries (requested)');
		await expect(page.locator('#batch-result-2')).toHaveText('Walk the dog (requested)');
		await page.waitForTimeout(100); // allow all requests to finish

		// Only the command request itself — refreshes for every requested entry
		// were rolled into a single batched call and returned via single-flight
		// in the command response.
		expect(request_count).toBe(1);
	});

	test('query.batch redirect settles batched promises', async ({ page }) => {
		await page.goto('/remote/batch-redirect');

		await page.click('#trigger');

		// the redirect must both navigate and settle the awaited query
		await expect(page.locator('#status')).toHaveText('resolved');
		expect(page.url()).toContain('#redirected');
	});

	test('non-exported remote functions are never serialized into responses', async ({ page }) => {
		await page.goto('/remote/private-query');

		const [response] = await Promise.all([
			page.waitForResponse((r) => r.url().includes('/_app/remote')),
			page.click('#reveal')
		]);

		const body = await response.text();

		// the command's own (transformed) result is present...
		expect(body).toContain('PRIVATE-DATA');
		// ...but the private query's raw value must not leak
		expect(body).not.toContain('private-data');

		await expect(page.locator('#result')).toHaveText('PRIVATE-DATA');
	});

	test('query.batch resolver function always receives validated arguments', async ({ page }) => {
		await page.goto('/remote/batch-validation');

		await expect(page.locator('#phrase')).toHaveText('use the force');
		await page.locator('button').click();
		await expect(page.locator('#phrase')).toHaveText('i am your father');
	});

	test('query.live streams updates and reconnects after disconnect', async ({ page, context }) => {
		await page.goto('/remote/live');
		await page.click('#reset');

		await expect(page.locator('#first-value')).toHaveText('0');
		await expect(page.locator('#count')).toHaveText('0');
		await expect(page.locator('#connected')).toHaveText('true');

		await page.click('#increment');
		await expect(page.locator('#count')).toHaveText('1');
		await expect(page.locator('#first-value')).toHaveText('1');

		await context.setOffline(true);
		await expect(page.locator('#count')).toHaveText('1');
		await expect(page.locator('#first-value')).toHaveText('1');

		await context.setOffline(false);
		await page.click('#increment');
		await expect(page.locator('#count')).toHaveText('2');
		await expect(page.locator('#first-value')).toHaveText('2');
		await expect(page.locator('#connected')).toHaveText('true');
	});

	test('query.live marks finite iterators as done and only reconnects explicitly', async ({
		page
	}) => {
		await page.goto('/remote/live');
		await page.click('#reset');

		await expect(page.locator('#finite-done')).toHaveText('true');
		await expect(page.locator('#finite-connected')).toHaveText('false');

		await page.waitForTimeout(200);
		await page.click('#stats');
		await expect(page.locator('#stats-value')).not.toHaveText('pending');
		const stats = JSON.parse((await page.locator('#stats-value').textContent()) ?? '{}');
		const before = stats.finite_connection_count;

		await page.waitForTimeout(200);
		await page.click('#stats');
		await expect(page.locator('#stats-value')).not.toHaveText('pending');
		const after_wait = JSON.parse((await page.locator('#stats-value').textContent()) ?? '{}');
		expect(after_wait.finite_connection_count).toBe(before);

		await page.click('#finite-reconnect');
		await expect
			.poll(async () => {
				await page.click('#stats');
				await expect(page.locator('#stats-value')).not.toHaveText('pending');
				return JSON.parse((await page.locator('#stats-value').textContent()) ?? '{}')
					.finite_connection_count;
			})
			.toBeGreaterThan(before);
		await expect(page.locator('#finite-done')).toHaveText('true');
	});

	test('query.live can be reconnected from server command handlers', async ({ page }) => {
		await page.goto('/remote/live');
		await page.click('#reset');

		await page.click('#stats');
		await expect(page.locator('#stats-value')).not.toHaveText('pending');
		const before = JSON.parse((await page.locator('#stats-value').textContent()) ?? '{}');

		await page.click('#reconnect-live');

		await expect
			.poll(async () => {
				await page.click('#stats');
				const value = (await page.locator('#stats-value').textContent()) ?? '{}';
				if (value === 'pending') return before.cleanup_count;
				return JSON.parse(value).cleanup_count;
			})
			.toBeGreaterThan(before.cleanup_count);

		await expect(page.locator('#connected')).toHaveText('true');
	});

	test('command updates(live_query_function) can request reconnect via requested(...).reconnectAll', async ({
		page
	}) => {
		await page.goto('/remote/live');
		await page.click('#reset');
		await expect(page.locator('#connected')).toHaveText('true');

		await page.click('#stats');
		await expect(page.locator('#stats-value')).not.toHaveText('pending');
		const before = JSON.parse((await page.locator('#stats-value').textContent()) ?? '{}');

		let sent_refreshes = 0;
		/** @type {string | null} */
		let first_refresh = null;
		let reconnect_command_requests = 0;
		/** @type {string[]} */
		const page_errors = [];
		page.on('pageerror', (error) => {
			page_errors.push(String(error));
		});
		page.on('request', (request) => {
			if (!request.url().includes('/_app/remote/')) return;
			if (request.method() !== 'POST') return;
			if (request.url().includes('reconnect_requested_live')) {
				reconnect_command_requests += 1;
			}

			const body = request.postDataJSON();
			if (Array.isArray(body?.refreshes)) {
				sent_refreshes += body.refreshes.length;
				if (!first_refresh && body.refreshes[0]) first_refresh = body.refreshes[0];
			}
		});
		const [response] = await Promise.all([
			page.waitForResponse((response) => response.url().includes('reconnect_requested_live')),
			page.click('#reconnect-live-requested')
		]);
		const reconnect_response = await response.text();
		expect(page_errors).toEqual([]);
		expect(reconnect_command_requests).toBeGreaterThan(0);
		expect(reconnect_response).toContain('"type":"result"');
		expect(sent_refreshes).toBeGreaterThan(0);
		// @ts-expect-error
		expect(first_refresh?.includes('/')).toBe(true);

		await expect
			.poll(async () => {
				await page.click('#stats');
				const value = (await page.locator('#stats-value').textContent()) ?? '{}';
				if (value === 'pending') return 0;
				return JSON.parse(value).requested_reconnect_count;
			})
			.toBeGreaterThan(0);

		await expect
			.poll(async () => {
				await page.click('#stats');
				const value = (await page.locator('#stats-value').textContent()) ?? '{}';
				if (value === 'pending') return before.cleanup_count;
				return JSON.parse(value).cleanup_count;
			})
			.toBeGreaterThan(before.cleanup_count);
	});

	test('form reconnect updates targeted live query without reconnecting all live queries', async ({
		page
	}) => {
		await page.goto('/remote/live');
		await page.click('#reset');

		await page.click('#stats');
		await expect(page.locator('#stats-value')).not.toHaveText('pending');
		const before = JSON.parse((await page.locator('#stats-value').textContent()) ?? '{}');

		await page.click('#reconnect-live-form');

		await expect
			.poll(async () => {
				await page.click('#stats');
				const value = (await page.locator('#stats-value').textContent()) ?? '{}';
				if (value === 'pending') return before.cleanup_count;
				return JSON.parse(value).cleanup_count;
			})
			.toBeGreaterThan(before.cleanup_count);

		await expect
			.poll(async () => {
				await page.click('#stats');
				const value = (await page.locator('#stats-value').textContent()) ?? '{}';
				if (value === 'pending') return before.finite_connection_count;
				return JSON.parse(value).finite_connection_count;
			})
			.toBe(before.finite_connection_count);
	});

	test('query.live can be detached from the page', async ({ page }) => {
		await page.goto('/remote/live');
		await page.click('#reset');
		await expect(page.locator('#count')).toHaveText('0');

		await page.click('#toggle-live');
		await expect(page.locator('#detached')).toHaveText('detached');
	});

	test('query.live does not resend unchanged devalue payloads', async ({ page }) => {
		await page.goto('/remote/live');
		await page.click('#reset');

		await expect(page.locator('#duplicate-payload-count')).toHaveText('0');
		const before = Number(await page.locator('#duplicate-updates').textContent());

		await page.click('#notify-only');
		await page.waitForTimeout(100);
		await expect(page.locator('#duplicate-payload-count')).toHaveText('0');
		await expect(page.locator('#duplicate-updates')).toHaveText(String(before));
	});

	test('query.live is async-iterable and joins the shared cache stream', async ({ page }) => {
		await page.goto('/remote/live');
		await page.click('#reset');
		await expect(page.locator('#count')).toHaveText('0');

		await page.click('#start-for-await');

		// the first value should be the current value (0) — emitted synchronously
		// from the shared LiveQuery's cache rather than via a fresh connection.
		await expect(page.locator('#for-await-count')).toHaveText('1');
		await expect(page.locator('#for-await-values')).toHaveText('0');

		await page.click('#increment');
		await expect(page.locator('#for-await-count')).toHaveText('2');
		await expect(page.locator('#for-await-values')).toHaveText('0,1');

		await page.click('#increment');
		// iteration breaks after 3 values
		await expect(page.locator('#for-await-count')).toHaveText('3');
		await expect(page.locator('#for-await-values')).toHaveText('0,1,2');
	});

	test('for await consumers continue receiving values across refreshAll-triggered reconnects', async ({
		page
	}) => {
		await page.goto('/remote/live');
		await page.click('#reset');
		await expect(page.locator('#count')).toHaveText('0');

		await page.click('#start-stream-log');
		// the first value should be the current value (0)
		await expect(page.locator('#stream-log')).toHaveText(/0/);

		// refreshAll() calls reconnect(), which keeps the existing fan-out
		// open so active `for await` consumers continue receiving values from
		// the new connection without interruption.
		await page.click('#run-refresh-all');
		await expect(page.locator('#refresh-state')).toHaveText('resolved');

		// Trigger a new value — the still-attached consumer must see it.
		// Before the fix the fan-out was replaced, orphaning the subscriber so
		// this value never arrived and the loop hung.
		await page.click('#increment');
		await expect(page.locator('#stream-log')).toContainText('1');
	});

	test('refreshAll resolves while a live query is offline', async ({ page, context }) => {
		await page.goto('/remote/live');
		await page.click('#reset');
		await expect(page.locator('#connected')).toHaveText('true');

		await context.setOffline(true);

		// reconnect()'s handshake must settle on every #main exit path (here:
		// offline) so that awaiting refreshAll() doesn't deadlock.
		await page.click('#run-refresh-all');
		await expect(page.locator('#refresh-state')).toHaveText(/resolved|rejected/);

		await context.setOffline(false);
	});

	test('query.live cleans up server iterator on reload', async ({ page }) => {
		await page.goto('/remote/live');
		await page.click('#stats');
		await expect(page.locator('#stats-value')).not.toHaveText('pending');
		const before_cleanup = JSON.parse(
			(await page.locator('#stats-value').textContent()) ?? '{}'
		).cleanup_count;

		await page.reload();
		await expect(page.locator('#count')).toBeVisible();

		await expect
			.poll(async () => {
				await page.click('#stats');
				const value = (await page.locator('#stats-value').textContent()) ?? '{}';
				if (value === 'pending') return before_cleanup;
				const stats = JSON.parse(value);
				return stats.cleanup_count;
			})
			.toBeGreaterThan(before_cleanup);
	});

	test('query.live surfaces mid-stream HttpError and does not reconnect', async ({ page }) => {
		await page.goto('/remote/live-terminal');

		await expect(page.locator('#value')).toHaveText('0');
		await expect(page.locator('#connected')).toHaveText('true');

		await page.click('#refresh-connections');
		await expect(page.locator('#connections')).not.toHaveText('pending');
		const before = Number(await page.locator('#connections').textContent());

		await page.click('#trigger-error');

		await expect(page.locator('#error')).toHaveText('418 terminal teapot');
		await expect(page.locator('#connected')).toHaveText('false');
		await expect(page.locator('#done')).toHaveText('true');

		// A terminal HttpError must not trigger a reconnect — the connection count
		// should not increase after the failure.
		await page.waitForTimeout(500);
		await page.click('#refresh-connections');
		await expect
			.poll(async () => Number(await page.locator('#connections').textContent()))
			.toBe(before);
	});

	test('query.live navigates on mid-stream redirect', async ({ page }) => {
		await page.goto('/remote/live-terminal');

		await expect(page.locator('#value')).toHaveText('0');
		await expect(page.locator('#connected')).toHaveText('true');

		await page.click('#trigger-redirect');

		await expect(page.locator('#redirect-target')).toBeVisible();
		expect(page.url()).toMatch(/\/remote\/live-terminal\/target$/);
	});

	test('refreshAll works with schema transforms (number to string)', async ({ page }) => {
		await page.goto('/remote/form/transform');

		await expect(page.locator('#result')).toHaveText('Count for 42 is 0');

		await page.click('#update-btn');
		await expect(page.locator('#result')).toHaveText('Count for 42 is 1');
	});

	test('.set() works with schema transforms when arg comes from requested()', async ({ page }) => {
		await page.goto('/remote/form/transform');

		await expect(page.locator('#result')).toHaveText(/Count for 42 is \d+/);

		await page.click('#set-btn');
		await expect(page.locator('#result')).toHaveText('Set value for 42');
	});

	test.describe('query runtime guardrails', () => {
		test('query created outside tracking context can be awaited and access reactive state', async ({
			page
		}) => {
			await page.goto('/remote/query-runtime-errors/not-tracked');

			await page.click('#create');
			await expect(page.locator('#status')).toHaveText('query created');

			await page.click('#await');
			await expect(page.locator('#result')).toHaveText('0');

			await page.click('#read-current');
			await expect(page.locator('#result')).toHaveText('0');
		});
	});

	test.describe('isomorphic query caching', () => {
		test('await in event handler shares cache with simultaneous awaits', async ({ page }) => {
			await page.goto('/remote/isomorphic-caching');

			await page.click('#await-dedupe');
			await expect(page.locator('#dedupe')).toHaveText('dedupe ok');
			// All three awaits should have deduped to a single network request
			await expect(page.locator('#call-count')).toHaveText('1');
		});
	});

	// TODO ditto
	test('query works with transport', async ({ page }) => {
		await page.goto('/remote/transport');

		await expect(page.locator('h1')).toHaveText('hello from remote function!');
	});

	test('denied by hook: transport 403 surfaces as error.status 403 on query resource', async ({
		page
	}) => {
		await page.goto('/remote/transport-status');

		// initial load should succeed and show the value
		await expect(page.locator('#value')).toHaveText('ok');

		// set the cookie and trigger a refresh; the handle hook blocks remote requests
		await page.click('#deny-btn');

		// the query resource should report the 403 status from the hook
		await expect(page.locator('#status')).toHaveText('403');
	});

	test('form.for() with enhance does not duplicate requests', async ({ page }) => {
		await page.goto('/remote/form/for-duplicate');

		for (let i = 1; i <= 3; i++) {
			await page.click('#submit');
			await expect(page.locator('#count')).toHaveText(String(i));
		}
	});

	test('.as(type, value) updates when data changes after submission', async ({ page }) => {
		await page.goto('/remote/form/as-value');

		const form1 = page.locator('form').nth(0);

		const text = form1.locator('input[name^="text_field"]');
		const checkbox = form1.locator('input[name^="b:checkbox_field"]');

		// initial values rendered correctly
		await expect(text).toHaveValue('Example text');

		await expect(checkbox).toBeChecked();

		// change the fields and submit
		await text.fill('Updated text');
		await checkbox.uncheck();
		await form1.locator('button').click();

		// after submission, the query refreshes and the display should update
		await expect(page.locator('div').first()).toContainText('Updated text');

		// the input value should reflect the updated data
		await expect(text).toHaveValue('Updated text');
		await expect(checkbox).not.toBeChecked();
	});

	test('.as(type, value) updates when field.set() is called', async ({ page }) => {
		await page.goto('/remote/form/as-value');

		const input = page.locator('[data-testid="as-value-set-input"]');

		// initial default value should be rendered
		await expect(input).toHaveValue('default text');

		// click button to call field.set()
		await page.click('#set-text-field');

		// the input with a default value should reflect the updated state
		await expect(input).toHaveValue('Set via method');

		// the value display should also show the updated value
		await expect(page.locator('#set-value-display')).toHaveText('Set via method');
	});
	test('form does refresh queries when a remote request', async ({ page }) => {
		await page.goto(`/remote/form/noop-refresh-non-enhanced/${Date.now()}${Math.random()}`);

		const count = page.locator('#count');
		await expect(count).toHaveText('Count: 0');

		await page.click('button');

		// Should have refreshed
		await expect(count).toHaveText('Count: 1');
	});

	test('submit field value is available in the enhance callback', async ({ page }) => {
		await page.goto('/remote/form/submit-field-value');

		await page.click('#one');
		await expect(page.locator('#captured')).toHaveText('1');
		await expect(page.locator('#result')).toHaveText('1');

		await page.click('#five');
		await expect(page.locator('#captured')).toHaveText('5');
		await expect(page.locator('#result')).toHaveText('5');

		await page.click('#no-value');
		await expect(page.locator('#captured')).toBeEmpty();
		await expect(page.locator('#result')).toBeEmpty();

		await page.click('a');

		await page.locator('#input').fill('100');
		await page.click('#submit');
		await expect(page.locator('#captured')).toHaveText('100');
		await expect(page.locator('#result')).toHaveText('100');
	});

	test('form result from a native (non-enhanced) submission survives hydration', async ({
		page
	}) => {
		await page.goto('/remote/form/native-result');
		await page.locator('#plain input[name^="message"]').fill('hello');
		await page.click('#plain button');

		// wait for the page resulting from the full-page POST to hydrate
		await expect(page.locator('#hydrated')).toHaveText('true');
		await expect(page.locator('#result')).toHaveText('echo: hello');
	});

	test('form issues and input from a native (non-enhanced) submission survive hydration', async ({
		page
	}) => {
		await page.goto('/remote/form/native-result');
		await page.locator('#plain input[name^="message"]').fill('ab');
		await page.click('#plain button');

		// wait for the page resulting from the full-page POST to hydrate
		await expect(page.locator('#hydrated')).toHaveText('true');
		await expect(page.locator('#issue')).toHaveText('too short');
		await expect(page.locator('#plain input[name^="message"]')).toHaveValue('ab');
	});

	test('keyed form result from a native (non-enhanced) submission survives hydration', async ({
		page
	}) => {
		await page.goto('/remote/form/native-result');
		await page.locator('#keyed input[name^="message"]').fill('hello');
		await page.click('#keyed button');

		// wait for the page resulting from the full-page POST to hydrate
		await expect(page.locator('#hydrated')).toHaveText('true');
		await expect(page.locator('#keyed-result')).toHaveText('echo: hello');
		// the result must not leak to the unkeyed instance
		await expect(page.locator('#result')).toHaveText('none');
	});

	test('form keys containing slashes work with native (non-enhanced) submissions', async ({
		page
	}) => {
		await page.goto('/remote/form/native-result');
		await page.locator('#keyed-slash input[name^="message"]').fill('hello');
		await page.click('#keyed-slash button');

		// wait for the page resulting from the full-page POST to hydrate
		await expect(page.locator('#hydrated')).toHaveText('true');
		await expect(page.locator('#keyed-slash-result')).toHaveText('echo: hello');
	});

	test('form submission with .updates() does not trigger invalidateAll', async ({ page }) => {
		await page.goto(`/remote/form/updates-no-invalidate/${Date.now()}${Math.random()}`);

		const count = page.locator('#count');
		await expect(count).toHaveText('Count: 0');

		await page.click('button');
		await expect(page.locator('#result')).toHaveText('Result: done');

		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)

		// the developer took control of updates via `.updates()`, so the query
		// must not have been refreshed by an implicit invalidateAll
		await expect(count).toHaveText('Count: 0');
	});

	test('form submission with element id `reset` resets the form', async ({ page }) => {
		await page.goto('/remote/form/reset-id');
		await page.locator('[name^="message"]').fill('short');
		await page.click('button');

		await expect(page.locator('.error')).toHaveText('too short');

		await page.click('[type="reset"]');
		await expect(page.locator('.error')).toHaveCount(0);

		await page.locator('[name^="message"]').fill('long enough');
		await page.click('button');

		await expect(page.locator('#result')).toHaveText('long enough');
		await expect(page.locator('[name^="message"]')).toBeEmpty();
	});
});

test.describe('client error boundaries', () => {
	test('catches client render error and shows root +error.svelte', async ({ page, app }) => {
		await page.goto('/');
		await app.goto('/server-error-boundary');
		await expect(page.locator('#message')).toContainText(
			'render error (500 Internal Error, on /server-error-boundary)'
		);
		await expect(page.locator('#nested-layout')).toHaveCount(0);
	});

	test('catches nested server render error and shows nested +error.svelte', async ({
		page,
		app
	}) => {
		await page.goto('/');
		await app.goto('/server-error-boundary/nested');
		await expect(page.locator('#nested-error-message')).toContainText(
			'nested render error (500 Internal Error, on /server-error-boundary/nested) | true | 500'
		);
		// The nested layout should still be visible
		await expect(page.locator('#nested-layout')).toBeVisible();
	});

	test('layout render error renders the same +error.svelte as SSR', async ({ page, app }) => {
		await page.goto('/');
		await app.goto('/server-error-boundary/layout-throws');
		await expect(page.locator('#message')).toContainText(
			'layout render error (500 Internal Error, on /server-error-boundary/layout-throws)'
		);
		await expect(page.locator('#layout-throws-error-message')).toHaveCount(0);
		await expect(page.locator('#nested-layout')).toHaveCount(0);
	});

	test('client navigation away from a render error tears down the stale +error.svelte', async ({
		page,
		app
	}) => {
		await page.goto('/');
		await app.goto('/server-error-boundary');
		await expect(page.locator('#message')).toContainText(
			'render error (500 Internal Error, on /server-error-boundary)'
		);

		await app.goto('/');
		await expect(page.locator('#message')).toHaveCount(0);
		await expect(page.locator('h3')).toHaveText('Tests');
	});

	test('client navigation away from a nested render error tears down the stale +error.svelte', async ({
		page,
		app
	}) => {
		await page.goto('/');
		await app.goto('/server-error-boundary/nested');
		await expect(page.locator('#nested-error-message')).toBeVisible();

		await app.goto('/');
		await expect(page.locator('#nested-error-message')).toHaveCount(0);
		await expect(page.locator('#nested-layout')).toHaveCount(0);
		await expect(page.locator('h3')).toHaveText('Tests');
	});

	test('client navigation away from an async render error tears down the stale +error.svelte', async ({
		page,
		app
	}) => {
		await page.goto('/');
		await app.goto('/server-error-boundary/async');
		// the awaited throw surfaces as a 404 through the root error boundary
		await expect(page.locator('h1')).toHaveText('404');

		await app.goto('/');
		await expect(page.locator('#message')).toHaveCount(0);
		await expect(page.locator('h3')).toHaveText('Tests');
	});

	test('client navigation using preloaded data away from a render error tears down the stale +error.svelte', async ({
		page,
		app
	}) => {
		await page.goto('/');
		await app.goto('/server-error-boundary');
		await expect(page.locator('#message')).toContainText('render error');

		// preloading the home route creates a fork (forkPreloads is enabled);
		// navigating via that fork must still tear down the failed boundary (#15694)
		await app.preloadData('/');
		await page.evaluate(() => new Promise((r) => setTimeout(r, 0)));
		await page.locator('#error-home').click();
		await expect(page).toHaveURL('/');
		await expect(page.locator('#message')).toHaveCount(0);
		await expect(page.locator('h3')).toHaveText('Tests');
	});

	test('redirecting from form clears result', async ({ page }) => {
		await page.goto('/remote/form/reset-on-redirect');

		const result = page.locator('#result');

		await page.locator('#return').click();
		await expect(result).toHaveText('hello world');
		await page.locator('#redirect').click();
		await expect(result).not.toHaveText('hello world');
	});

	test('remote form submit resolves after redirect navigation', async ({ page }) => {
		await page.goto('/remote/form/reset-on-redirect');

		await page.locator('#redirect-other').click();
		await page.waitForURL('/remote/form/redirect-target/destination');

		await expect
			.poll(() => page.evaluate(() => sessionStorage.getItem('submit-resolved-pathname')))
			.toBe('/remote/form/redirect-target/destination');
	});
});

test.describe('fork', () => {
	test('preloading one route must not throw errors when navigating elsewhere', async ({ page }) => {
		await page.goto('/fork');
		await page.locator('a[href="/fork/1"]').hover();
		await page.getByRole('button', { name: 'Go to /fork?key=value' }).click();

		await expect(page).toHaveURL('/fork?key=value');
		await expect(page.locator('a[href="/fork/1"]')).toBeVisible();
	});
});
