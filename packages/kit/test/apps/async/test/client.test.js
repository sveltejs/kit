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
	});
});

// have to run in serial because commands mutate in-memory data on the server (should fix this at some point)
test.describe('remote function mutations', () => {
	test.afterEach(async ({ page }) => {
		if (page.url().endsWith('/remote')) {
			await page.click('#reset-btn');
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
		expect(request_count).toBe(2);
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

	test('command returns correct sum and does client-initiated single flight mutation', async ({
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

	test('command does client-initiated single flight mutation with override', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		page.click('#multiply-override-refresh-btn');
		await expect(page.locator('#count-result')).toHaveText('6 / 6 (false)');
		await expect(page.locator('#command-result')).toHaveText('5');
		await expect(page.locator('#count-result')).toHaveText('5 / 5 (false)');
		await page.waitForTimeout(100); // allow all requests to finish (in case there are query refreshes which shouldn't happen)
		expect(request_count).toBe(1); // no query refreshes, since that happens as part of the command response
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

	test('prerendered entries not called in prod', async ({ page }) => {
		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));
		await page.goto('/remote/prerender');

		await page.click('#fetch-prerendered');
		await expect(page.locator('#fetch-prerendered')).toHaveText('yes');

		await page.click('#fetch-not-prerendered');
		await expect(page.locator('#fetch-not-prerendered')).toHaveText('d');
	});

	test('refreshAll reloads remote functions and load functions', async ({ page }) => {
		await page.goto('/remote');
		await expect(page.locator('#count-result')).toHaveText('0 / 0 (false)');

		let request_count = 0;
		page.on('request', (r) => (request_count += r.url().includes('/_app/remote') ? 1 : 0));

		await page.click('#refresh-all');
		await page.waitForTimeout(100); // allow things to rerun
		expect(request_count).toBe(3);
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
		expect(request_count).toBe(2);
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
});
