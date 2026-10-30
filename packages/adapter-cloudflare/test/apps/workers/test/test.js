import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { location } from '../../../../../../test-utils/deploy.js';

test('worker', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test('cloudflare:workers', async ({ request }) => {
	const res = await request.get('/env');
	expect(await res.text()).toBe('from wrangler.jsonc');
});

test('cloudflare:workers uses the current bindings after a wrangler config reload', async ({
	request
}) => {
	test.skip(!process.env.DEV);
	const config_path = path.join(location(process.cwd()), 'config/wrangler.jsonc');
	const original = fs.readFileSync(config_path, 'utf-8');

	/** @param {string} contents */
	function write_config(contents) {
		// Replace atomically so Wrangler cannot read a partially written config.
		fs.writeFileSync(`${config_path}.tmp`, contents);
		fs.renameSync(`${config_path}.tmp`, config_path);
	}

	// Evaluate cloudflare:workers before the platform proxy is replaced.
	expect(await (await request.get('/env')).text()).toBe('from wrangler.jsonc');

	try {
		write_config(original.replace('from wrangler.jsonc', 'updated binding'));
		await expect.poll(async () => (await request.get('/env')).text()).toBe('updated binding');
	} finally {
		write_config(original);
		await expect.poll(async () => (await request.get('/env')).text()).toBe('from wrangler.jsonc');
	}
});

test('Request.cf', async ({ request }) => {
	const res = await request.get('cf');
	const cf = await res.json();
	expect(cf.colo).toBeDefined();
});

test('read from $app/server works', async ({ request }) => {
	const content = fs.readFileSync(
		path.resolve(import.meta.dirname, '../src/routes/read/file.txt'),
		'utf-8'
	);
	const response = await request.get('/read');
	expect(await response.text()).toBe(content);
});

test('prerendering throws', async ({ request }) => {
	test.skip(!!process.env.DEV);
	const res = await request.get('/prerender');
	expect(await res.text()).toContain('Cannot access cloudflare:workers in a prerenderable route');
});
