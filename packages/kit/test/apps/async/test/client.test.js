import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';
const is_node18 = process.versions.node.startsWith('18.');
import { version as vite_version } from 'vite';
const is_vite5 = vite_version.startsWith('5.');

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe('remote functions', () => {
	test('preloading data works when the page component and server load both import a remote function', async ({
		page,
		clicknav
	}) => {
		test.skip(!process.env.DEV, 'remote functions are only analysed in dev mode');
		// TODO: remove with SvelteKit 3
		test.skip(is_node18 && is_vite5, 'vite5 in node18 fails to resolve remote function export');
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
});

// have to run in serial because commands mutate in-memory data on the server (should fix this at some point)
test.describe('remote function mutations', () => {
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

	test('hydrated batch data is reused', async ({ page }) => {
		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.goto('/remote/batch-ssr');
		await expect(page.locator('#ssr-batch-result-1')).toHaveText('Buy groceries');
		await expect(page.locator('#ssr-batch-result-2')).toHaveText('Walk the dog');
		await expect(page.locator('#ssr-batch-result-3')).toHaveText('Not found');
		expect(request_count).toBe(0);
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

	test('command inside handle hook works with POST', async ({ request }) => {
		const response = await request.post('/remote/hook-command');
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

	test('refreshAll({ includeLoadFunctions: false }) reloads remote functions only', async ({
		page
	}) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#refresh-remote-only');
		await page.waitForTimeout(100); // allow things to rerun
		expect(request_count).toBe(4);
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

	test('fields.set updates DOM before validate', async ({ page }) => {
		await page.goto('/remote/form/imperative');

		const input = page.locator('input[name="message"]');
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

	test('query.batch resolver function always receives validated arguments', async ({ page }) => {
		await page.goto('/remote/batch-validation');

		await expect(page.locator('#phrase')).toHaveText('use the force');
		await page.locator('button').click();
		await expect(page.locator('#phrase')).toHaveText('i am your father');
	});

	test.describe('query runtime guardrails', () => {
		test('query created outside tracking context can run but cannot expose reactive state', async ({
			page
		}) => {
			await page.goto('/remote/query-runtime-errors/not-tracked');

			await page.click('#create');
			await expect(page.locator('#status')).toHaveText('query created');

			await page.click('#run');
			await expect(page.locator('#result')).toHaveText('0');

			await page.click('#read-current');
			await expect(page.locator('#result')).toContainText(
				'This query was not created in a reactive context'
			);
		});

		test('query becomes inactive after its tracking context is destroyed', async ({ page }) => {
			await page.goto('/remote/query-runtime-errors/inactive');

			await expect(page.locator('#tracked-child')).toHaveText('tracked query ready');
			await page.click('#unmount');
			await expect(page.locator('#status')).toHaveText('child unmounted');
			await expect(page.locator('#tracked-child')).toHaveCount(0);

			await page.click('#read-current');
			await expect(page.locator('#result')).toContainText(
				'This query instance is no longer active'
			);
		});

		test('run is blocked during client render', async ({ page, app }) => {
			await page.goto('/remote');
			await app.goto('/remote/query-runtime-errors/run-in-render');

			await expect(page.locator('#error')).toContainText(
				'On the client, .run() can only be called outside render'
			);
		});
	});

	// TODO ditto
	test('query works with transport', async ({ page }) => {
		await page.goto('/remote/transport');

		await expect(page.locator('h1')).toHaveText('hello from remote function!');
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

		// initial values rendered correctly
		await expect(form1.locator('input[name="text_field"]')).toHaveValue('Example text');

		// change the text field and submit
		await form1.locator('input[name="text_field"]').fill('Updated text');
		await form1.locator('button').click();

		// after submission, the query refreshes and the display should update
		await expect(page.locator('div').first()).toContainText('Updated text');

		// the input value should reflect the updated data
		await expect(form1.locator('input[name="text_field"]')).toHaveValue('Updated text');

		// reset the values for the client tests
		await page.click('#reset-values');
	});
});

test.describe('client error boundaries', () => {
	test('catches client render error and shows root +error.svelte', async ({ page, app }) => {
		await page.goto('/');
		await app.goto('/server-error-boundary');
		await expect(page.locator('#message')).toContainText(
			'render error (500 Internal Error, on /server-error-boundary)'
		);
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
