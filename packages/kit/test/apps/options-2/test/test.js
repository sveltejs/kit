import fs from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

const output = fileURLToPath(new URL('../.svelte-kit/output', import.meta.url));

test.skip(() => !!process.env.REGISTER_SERVICE_WORKER);

test.describe.configure({ mode: 'parallel' });

test.describe('env', () => {
	test('resolves upwards', async ({ page }) => {
		await page.goto('/basepath/env');
		expect(await page.textContent('[data-testid="public"]')).toBe('public: hello');
		expect(await page.textContent('[data-testid="private-dynamic"]')).toBe(
			'private dynamic: secret resolved at runtime'
		);
		expect(await page.textContent('[data-testid="private-static"]')).toBe(
			'private static: secret resolved at build time'
		);
		expect(await page.textContent('[data-testid="private-validated-default"]')).toBe(
			'private validated default: foo'
		);
	});

	test('applies explicit env vars to %sveltekit.env%', async ({ page }) => {
		await page.goto('/basepath');
		await expect(page.locator('body')).toHaveAttribute('data-message', 'hello');
	});

	test('correct values are exported from $app/env/*', async ({ page }) => {
		await page.goto('/basepath/env/import-all');

		await expect(page.locator('[data-private]')).toHaveText(
			JSON.stringify({
				PRIVATE_EXPLICIT_ENV: 'secret resolved at runtime',
				PRIVATE_STATIC_EXPLICIT_ENV: 'secret resolved at build time',
				PRIVATE_VALIDATED_DEFAULT_ENV: 'foo'
			})
		);

		await expect(page.locator('[data-public]')).toHaveText(JSON.stringify({ MESSAGE: 'hello' }));
	});
});

test.describe('paths', () => {
	test('serves /basepath', async ({ page }) => {
		await page.goto('/basepath');
		expect(await page.textContent('h1')).toBe('Hello');
	});

	test('serves assets from /basepath', async ({ request }) => {
		const response = await request.get('/basepath/answer.txt');
		expect(await response.text()).toBe('42');
	});

	test('uses relative paths during SSR', async ({ page, javaScriptEnabled }) => {
		await page.goto('/basepath');

		let base = javaScriptEnabled ? '/basepath/' : './';
		expect(await page.textContent('[data-testid="base"]')).toBe(`base: ${base}`);
		expect(await page.textContent('[data-testid="assets"]')).toBe(`assets: ${base}`);

		await page.goto('/basepath/deeply/nested/page');

		base = javaScriptEnabled ? '/basepath/' : '../../';
		expect(await page.textContent('[data-testid="base"]')).toBe(`base: ${base}`);
		expect(await page.textContent('[data-testid="assets"]')).toBe(`assets: ${base}`);
	});

	test('serves /basepath with trailing slash always', async ({ page }) => {
		await page.goto('/basepath');
		expect(new URL(page.url()).pathname).toBe('/basepath/');
	});

	test('respects trailing slash option when navigating from /basepath', async ({
		page,
		clicknav
	}) => {
		await page.goto('/basepath');
		expect(new URL(page.url()).pathname).toBe('/basepath/');
		await clicknav('[data-testid="link"]');
		expect(new URL(page.url()).pathname).toBe('/basepath/hello');
	});

	test('query remote function from client accounts for base path', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/basepath/remote');
		await expect(page.locator('#count')).toHaveText('');
		await page.locator('button', { hasText: 'get count' }).click();
		await expect(page.locator('#count')).toHaveText('0');
	});

	test('prerender remote function from client accounts for base path', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/basepath/remote');
		await expect(page.locator('#prerendered')).toHaveText('');
		await page.locator('button', { hasText: 'get prerendered' }).click();
		await expect(page.locator('#prerendered')).toHaveText('yes');
	});

	test('command remote function from client accounts for base path', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/basepath/remote');
		await expect(page.locator('#count')).toHaveText('');
		await page.locator('button', { hasText: 'reset' }).click();
		await expect(page.locator('#count')).toHaveText('0');
	});

	test('form remote function from client accounts for base path', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/basepath/remote');
		await expect(page.locator('#count')).toHaveText('');
		await page.locator('input').fill('1');
		await page.locator('button', { hasText: 'submit' }).click();
		await expect(page.locator('#count')).toHaveText('1');
	});
});

test.describe('trailing slash', () => {
	test('trailing slash server prerendered without server load', async ({
		page,
		clicknav,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled || !!process.env.DEV);

		await page.goto('/basepath/trailing-slash-server');

		await clicknav('a[href="/basepath/trailing-slash-server/prerender"]');
		await expect(page.locator('h2')).toHaveText('/basepath/trailing-slash-server/prerender/');
	});
});

test.describe('Service worker', () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

	test('does not register /basepath/service-worker.js', async ({ page }) => {
		await page.goto('/basepath');
		expect(await page.content()).not.toMatch(/navigator\.serviceWorker/);
	});
});

test.describe("bundleStrategy: 'single'", () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled || !!process.env.DEV);

	test('loads a single js file and a single css file', async ({ page }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(new URL(r.url()).pathname));

		await page.goto('/basepath');

		await Promise.all([
			page.waitForTimeout(100), // wait for preloading to start
			page.waitForLoadState('networkidle') // wait for preloading to finish
		]);

		expect(requests.filter((req) => req.endsWith('.js')).length).toBe(1);
		expect(requests.filter((req) => req.endsWith('.css')).length).toBe(1);
	});

	test('app.decoders is accessed only after app has been initialised', async ({ page }) => {
		await page.goto('/basepath/deserialize');
		await expect(page.locator('p')).toHaveText('Hello world!');
	});

	test('serialization works with streaming', async ({ page }) => {
		await page.goto('/basepath/serialization-stream');
		await expect(page.locator('h1', { hasText: 'It works!' })).toBeVisible();
	});
});

test.describe('$app/env', () => {
	// regression test for https://github.com/sveltejs/kit/issues/15971:
	// importing `$app/env` before the router is initialized (e.g. in
	// hooks.client.js) must not throw `__SVELTEKIT_APP_VERSION__ is not defined`
	test('version is defined when imported during client init', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled || !process.env.DEV);

		await page.goto('/basepath', { wait_for_started: false });
		await expect(page.locator('body.started')).toBeVisible();
		expect(await page.pageErrors()).toHaveLength(0);
	});

	test('loads dynamic public environment variables in the service worker', () => {
		const content = fs.readFileSync(
			`${output}/prerendered/dependencies/_app/env.script.js`,
			'utf-8'
		);
		expect(content).toContain('hello');

		const service_worker = fs.readFileSync(`${output}/client/service-worker.js`, 'utf-8');
		expect(service_worker).toContain('importScripts("/basepath/_app/env.script.js");');
	});
});

test.describe('Vite', () => {
	// regression test for https://github.com/sveltejs/kit/issues/13249:
	// user `define`s referenced at the top level of hooks.client.js must be
	// available during client init
	test('global constant replacements are available during client init', async ({
		page,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled);

		await page.goto('/basepath', { wait_for_started: false });
		await expect(page.locator('body.started')).toBeVisible();
		expect(await page.evaluate(() => window.__test_user_define__)).toBe('works');
		expect(await page.pageErrors()).toHaveLength(0);
	});
});
