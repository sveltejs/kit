import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled || !process.env.REGISTER_SERVICE_WORKER);

test('import proxy /basepath/service-worker.js', async ({ request }) => {
	test.skip(!process.env.DEV);

	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const response = await request.get('/basepath/service-worker.js');
	const content = await response.text();
	expect(content).toEqual(
		`import '${path.join('/basepath', '/@fs', __dirname, '../src/service-worker.js')}';`
	);
});

test('build /basepath/service-worker.js', async ({ baseURL, request }) => {
	test.skip(!!process.env.DEV);

	const response = await request.get('/basepath/service-worker.js');
	const content = await response.text();

	const fn = new Function('self', 'location', content);

	const self = {
		addEventListener: () => {},
		base: null,
		build: null
	};

	const pathname = '/basepath/service-worker.js';

	fn(self, {
		href: baseURL + pathname,
		pathname
	});

	expect(self.base).toBe('/basepath');
	expect(self.build?.[0]).toMatch(/\/basepath\/_app\/immutable\/bundle\.[\w-]+\.js/);
	expect(self.image_src).toMatch(/\/basepath\/_app\/immutable\/assets\/image\.[\w-]+\.jpg/);
});

test('works with CSP require-trusted-types-for', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (err) => {
		errors.push(err.message);
	});

	await page.goto('/basepath/csp-trusted-types');
	expect(errors.length).toEqual(0);
});
