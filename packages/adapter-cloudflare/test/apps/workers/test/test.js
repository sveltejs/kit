import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { location } from '../../../../../../test-utils/deploy.js';

const base = process.env.TEST_BASE ? '/base' : '';

test('worker', async ({ page }) => {
	await page.goto(`${base}/`);
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test('cloudflare:workers', async ({ request }) => {
	const res = await request.get(`${base}/env`);
	expect(await res.text()).toBe('from cloudflare.config.ts');
	expect(res.headers()['x-instrumented']).toBe('from cloudflare.config.ts');
});

test('$app/env/private reads text bindings from cloudflare.config.ts', async ({ request }) => {
	const res = await request.get('/env/private');
	expect(await res.text()).toBe('from cloudflare.config.ts');
});

test('Request.cf', async ({ request }) => {
	const res = await request.get(`${base}/cf`);
	const cf = await res.json();
	expect(cf.colo).toBeDefined();
});

test('read from $app/server works', async ({ request }) => {
	const content = fs.readFileSync(
		path.resolve(import.meta.dirname, '../src/routes/read/file.txt'),
		'utf-8'
	);
	const response = await request.get(`${base}/read`);
	expect(await response.text()).toBe(content);
});

test('static and prerendered assets', async ({ request }) => {
	const asset = await request.get(`${base}/asset.txt`);
	expect(await asset.text()).toBe('static asset\n');
	if (!process.env.DEV) {
		expect(asset.headers()['x-static-asset']).toBe('true');
		const redirect = await request.get(`${base}/redirect.txt`, { maxRedirects: 0 });
		expect(redirect.status()).toBe(302);
		expect(redirect.headers().location).toBe(`${base}/asset.txt`);
	}
	const prerendered = await request.get(`${base}/static`);
	expect(await prerendered.text()).toBe('prerendered response');
});

test('prerendering throws', async ({ request }) => {
	test.skip(!!process.env.DEV);
	const res = await request.get(`${base}/prerender`);
	expect(await res.text()).toContain('Cannot access cloudflare:workers in a prerenderable route');
});

test('CommonJS dependencies can require Node builtins', async ({ request }) => {
	const res = await request.get(`${base}/cjs-node-builtin`);
	expect(await res.text()).toMatch(/^[0-9a-f]{16}$/);
});

test('dependencies resolve the workerd export condition', async ({ request }) => {
	const res = await request.get(`${base}/conditions`);
	expect(await res.text()).toBe('workerd');
});

test('global fetch rejects relative URLs during dev', async ({ request }) => {
	test.skip(!process.env.DEV, 'only checked during dev');

	const res = await request.get(`${base}/fetch-relative`);
	expect(await res.text()).toContain('fetch_relative_url');
});

test('SvelteKit runs in workerd', async ({ request }) => {
	const res = await request.get(`${base}/runtime`);
	expect(await res.text()).toBe('Cloudflare-Workers');
});

test('remote functions run in workerd', async ({ page }) => {
	await page.goto(`${base}/remote`);
	await expect(page.locator('#runtime')).toHaveText('Cloudflare-Workers');

	await page.locator('button').click();
	await expect(page.locator('button')).toHaveText('1');
});

test('styles are inlined during dev', async ({ request }) => {
	test.skip(!process.env.DEV, 'styles are only inlined during dev');

	const eager = await (await request.get(`${base}/css`)).text();
	expect(eager).toContain('rgb(1, 2, 3)');
	expect(eager).toContain('rgb(4, 5, 6)');
	expect(eager).not.toContain('rgb(7, 8, 9)');

	// the same modules as before, which now depend on one more component
	const lazy = await (await request.get(`${base}/css?lazy`)).text();
	expect(lazy).toContain('rgb(7, 8, 9)');
});

test.describe.serial('modules that fail to load', () => {
	test.skip(!process.env.DEV, 'the overlay only exists during dev');

	// the dev server runs in a copy of the app
	const file = path.join(
		location(path.resolve(import.meta.dirname, '..')),
		'src/routes/errors/load/+page.server.js'
	);

	/** @type {string} */
	let original;

	test.beforeAll(() => {
		original = fs.readFileSync(file, 'utf-8');
	});

	test.afterEach(() => {
		fs.writeFileSync(file, original);
	});

	for (const [name, code, message] of [
		[
			'throws',
			"throw new Error('thrown while the module loads');",
			'thrown while the module loads'
		],
		['imports a missing file', "import './does-not-exist.js';", 'does-not-exist.js'],
		['has a syntax error', 'export function load() {', 'invalid JS syntax'],
		[
			'throws a long error',
			"throw new Error('a long message ' + 'x'.repeat(50000));",
			'a long message xxx'
		]
	]) {
		test(`a module that ${name} shows the error overlay`, async ({ page, request }) => {
			// the overlay shows in every connected page, so this one only watches
			await page.goto(`${base}/errors`);
			fs.writeFileSync(file, code);

			const overlay = page.locator('vite-error-overlay .message-body');

			// until the dev server has picked up the change
			await expect(async () => {
				await request.get(`${base}/errors/load`);
				await expect(overlay).toContainText(message, { timeout: 500 });
			}).toPass();
		});
	}
});

test('imported assets are served', async ({ page }) => {
	await page.goto(`${base}/asset`);
	await expect(page.locator('img')).not.toHaveAttribute('src', /^data:/);
	await expect
		.poll(() => page.locator('img').evaluate((img) => img.complete && img.naturalWidth))
		.toBe(10);
});

test('read from $app/server knows the size of the file', async ({ request }) => {
	// workerd does not send it for streamed responses, so this checks what read returns
	const length = await (await request.get(`${base}/asset/length`)).text();
	expect(length).toBe(
		String(fs.statSync(path.resolve(import.meta.dirname, '../src/routes/asset/logo.svg')).size)
	);
});

test('the service worker is served', async ({ request }) => {
	const res = await request.get(`${base}/service-worker.js`);
	expect(res.status()).toBe(200);
	expect(res.headers()['content-type']).toContain('javascript');
});
