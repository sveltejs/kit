import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'serial' });

test.describe('Filesystem updates', () => {
	if (process.env.DEV) {
		test('New route is immediately available in dev', async ({ page }) => {
			await page.goto('/new-route');

			// hash the filename so that it won't conflict with
			// future test file that has the same name
			const route = 'zzzz' + Date.now();
			const content = 'Hello new route';
			const filepath = path.join(
				import.meta.dirname,
				`../src/routes/new-route/${route}/+page.svelte`
			);
			const dir = path.dirname(filepath);

			try {
				fs.mkdirSync(dir);
				fs.writeFileSync(filepath, `<h1>${content}</h1>`);
				await page.waitForTimeout(500); // this is the rare time we actually need waitForTimeout; we have no visibility into whether the module graph has been invalidated
				await page.goto(`/new-route/${route}`);

				expect(await page.textContent('h1')).toBe(content);
			} finally {
				fs.rmSync(dir, { recursive: true });
			}
		});
	}

	test('Saving a component does not reload unrelated server modules', async ({
		page,
		request,
		javaScriptEnabled
	}) => {
		test.skip(!process.env.DEV || !javaScriptEnabled);

		const file = fileURLToPath(new URL('../src/routes/ssr-reload/Header.svelte', import.meta.url));
		const contents = fs.readFileSync(file, 'utf-8');
		await page.goto('/ssr-reload');
		const { id } = await (await request.get('/ssr-reload')).json();

		try {
			fs.writeFileSync(file, contents);
			// Allow the filesystem event to reach the SSR module runner before requesting again.
			await page.waitForTimeout(500);
			expect((await (await request.get('/ssr-reload')).json()).id).toBe(id);

			fs.writeFileSync(file, contents.replace('original', 'updated'));
			await expect(page.locator('h1')).toHaveText('updated');
			await expect(async () => {
				const response = await request.get('/ssr-reload', { headers: { accept: 'text/html' } });
				expect(await response.text()).toMatch(/<h1[^>]*>updated<\/h1>/);
			}).toPass();
			expect((await (await request.get('/ssr-reload')).json()).id).toBe(id);

			// Separate writes so Chokidar's 50ms change throttle doesn't swallow an edit.
			await page.waitForTimeout(100);
			fs.writeFileSync(file, contents.replace('original', 'updated').replace('red', 'blue'));
			await expect(page.locator('h1')).toHaveCSS('color', 'rgb(0, 0, 255)');
			await expect(async () => {
				const response = await request.get('/ssr-reload', { headers: { accept: 'text/html' } });
				expect(await response.text()).toMatch(/color:\s*blue/);
			}).toPass();
			expect((await (await request.get('/ssr-reload')).json()).id).toBe(id);
			await page.waitForTimeout(100);
		} finally {
			fs.writeFileSync(file, contents);
		}
	});

	test('Server module dependencies are updated on the next request', async ({
		page,
		request,
		javaScriptEnabled
	}) => {
		test.skip(!process.env.DEV || !javaScriptEnabled);

		const file = fileURLToPath(new URL('../src/routes/ssr-reload/message.js', import.meta.url));
		const contents = fs.readFileSync(file, 'utf-8');
		expect((await (await request.get('/ssr-reload')).json()).message).toBe('original');

		try {
			fs.writeFileSync(file, contents.replace('original', 'updated'));
			await expect(async () => {
				expect((await (await request.get('/ssr-reload')).json()).message).toBe('updated');
			}).toPass();
			// Keep the cleanup write outside Chokidar's change throttle window.
			await page.waitForTimeout(100);
		} finally {
			fs.writeFileSync(file, contents);
		}

		await expect(async () => {
			expect((await (await request.get('/ssr-reload')).json()).message).toBe('original');
		}).toPass();
	});

	test('Server hooks can be added, updated and removed', async ({
		page,
		request,
		javaScriptEnabled
	}) => {
		test.skip(!process.env.DEV || !javaScriptEnabled);

		const file = fileURLToPath(new URL('../src/hooks.server.js', import.meta.url));
		const contents = `export async function handle({ event, resolve }) {
	const response = await resolve(event);
	response.headers.set('x-hmr', 'original');
	return response;
}
`;
		expect(fs.existsSync(file)).toBe(false);
		expect((await request.get('/ssr-reload')).headers()['x-hmr']).toBeUndefined();

		try {
			fs.writeFileSync(file, contents);
			await expect(async () => {
				expect((await request.get('/ssr-reload')).headers()['x-hmr']).toBe('original');
			}).toPass();

			// Separate writes so Chokidar's 50ms change throttle doesn't swallow an edit.
			await page.waitForTimeout(100);
			fs.writeFileSync(file, contents.replace('original', 'updated'));
			await expect(async () => {
				expect((await request.get('/ssr-reload')).headers()['x-hmr']).toBe('updated');
			}).toPass();
			await page.waitForTimeout(100);
		} finally {
			fs.unlinkSync(file);
		}

		await expect(async () => {
			expect((await request.get('/ssr-reload')).headers()['x-hmr']).toBeUndefined();
		}).toPass();
	});

	test('Components are not double-mounted', async ({ page, javaScriptEnabled }) => {
		// js-only: the file on disk is shared with the parallel no-js project, whose
		// writes would trigger HMR updates that remount the component mid-assertion
		test.skip(!javaScriptEnabled);

		const file = fileURLToPath(new URL('../src/routes/double-mount/+page.svelte', import.meta.url));
		const contents = fs.readFileSync(file, 'utf-8');

		const mounted = 1;

		try {
			// we write to the file, to trigger HMR invalidation
			fs.writeFileSync(file, contents.replace(/PLACEHOLDER:\d+/, `PLACEHOLDER:${Date.now()}`));
			await page.goto('/double-mount');
			expect(await page.textContent('h1')).toBe(`mounted: ${mounted}`);
			await page.click('button');
			await page.waitForTimeout(100);
			expect(await page.textContent('h1')).toBe(`mounted: ${mounted}`);
		} finally {
			fs.writeFileSync(file, contents.replace(/PLACEHOLDER:\d+/, 'PLACEHOLDER:0'));
		}
	});

	test('Universal node is updated when page options change', async ({
		page,
		javaScriptEnabled,
		get_computed_style
	}) => {
		test.skip(!process.env.DEV || !javaScriptEnabled);

		const file = fileURLToPath(new URL('../src/routes/universal/+page.js', import.meta.url));
		const contents = fs.readFileSync(file, 'utf-8');

		try {
			fs.writeFileSync(file, contents.replace(/export const ssr = false;\n/, ''));
			// the file write invalidates the module graph asynchronously, so retry the
			// navigation until the dev server picks up the change and SSR fails (rather
			// than racing a fixed `waitForTimeout` against Vite's invalidation)
			await expect(async () => {
				await page.goto('/universal', { wait_for_started: false });
				await expect(page.locator('h1')).toHaveText('Internal Error', { timeout: 1000 });
			}).toPass();
			expect(await get_computed_style('body', 'background-color')).not.toBe('rgb(255, 0, 0)');
			// Keep the cleanup write outside Chokidar's change throttle window.
			await page.waitForTimeout(100);
		} finally {
			fs.writeFileSync(file, contents);
		}

		await page.waitForTimeout(500); // this is the rare time we actually need waitForTimeout; we have no visibility into whether the module graph has been invalidated
		// a reload is required because Vite HMR doesn't trigger if the page has never loaded successfully
		await page.reload();
		expect(await get_computed_style('body', 'background-color')).toBe('rgb(255, 0, 0)');

		try {
			fs.writeFileSync(file, contents.replace(/export const ssr = .*;/, 'export const ssr = !1;'));
			await page.waitForTimeout(500); // this is the rare time we actually need waitForTimeout; we have no visibility into whether the module graph has been invalidated
			expect(await get_computed_style('body', 'background-color')).not.toBe('rgb(255, 0, 0)');
			await expect(page.locator('h1')).toHaveText('Internal Error');
			await page.waitForTimeout(100);
		} finally {
			fs.writeFileSync(file, contents.replace(/\\nexport const ssr = false;\\n/, ''));
		}

		// Restoring the options triggers navigation. Let it finish before context teardown.
		await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
	});

	test('Universal node is updated when parent page options change', async ({
		page,
		javaScriptEnabled,
		get_computed_style
	}) => {
		test.skip(!process.env.DEV || !javaScriptEnabled);

		const file = fileURLToPath(
			new URL('../src/routes/universal/parent-changed/+layout.js', import.meta.url)
		);
		const contents = fs.readFileSync(file, 'utf-8');

		try {
			await page.goto('/universal/parent-changed');
			expect(await get_computed_style('body', 'background-color')).toBe('rgb(255, 0, 0)');

			fs.writeFileSync(file, contents.replace(/export const ssr = false;/, ''));
			await page.waitForTimeout(500); // this is the rare time we actually need waitForTimeout; we have no visibility into whether the module graph has been invalidated
			expect(await get_computed_style('body', 'background-color')).not.toBe('rgb(255, 0, 0)');
			await expect(page.locator('h1')).toHaveText('Internal Error');
		} finally {
			fs.writeFileSync(file, contents);
		}

		// Restoring the layout triggers navigation. Let it finish before context teardown.
		await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
	});

	// Keep intentional server errors last: Vite buffers overlays until a client update.
	test('Server module dependencies recover after an evaluation error', async ({
		page,
		request,
		javaScriptEnabled
	}) => {
		test.skip(!process.env.DEV || !javaScriptEnabled);

		const file = fileURLToPath(new URL('../src/routes/ssr-reload/message.js', import.meta.url));
		const contents = fs.readFileSync(file, 'utf-8');
		await expect(async () => {
			expect((await (await request.get('/ssr-reload')).json()).message).toBe('original');
		}).toPass();

		try {
			// Separate writes so Chokidar's 50ms change throttle doesn't swallow an edit.
			await page.waitForTimeout(100);
			fs.writeFileSync(file, `${contents}\nthrow new Error('SSR dependency failure');\n`);
			await expect(async () => {
				expect((await request.get('/ssr-reload')).status()).toBe(500);
			}).toPass();

			await page.waitForTimeout(100);
			fs.writeFileSync(file, contents.replace('original', 'recovered'));
			await expect(async () => {
				const response = await request.get('/ssr-reload');
				expect(response.status()).toBe(200);
				expect((await response.json()).message).toBe('recovered');
			}).toPass();
			await page.waitForTimeout(100);
		} finally {
			fs.writeFileSync(file, contents);
		}

		await expect(async () => {
			expect((await (await request.get('/ssr-reload')).json()).message).toBe('original');
		}).toPass();
	});
});
