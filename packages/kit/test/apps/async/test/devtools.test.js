import process from 'node:process';
import { expect } from '../../../playwright-matchers.js';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

/**
 * a minimal devtool injected before the app like a vite devtools clientScript
 */
function devtool() {
	/** @type {any} */
	const w = window;
	w.__devtool = { events: [], hook: null };

	/** @param {any} hook */
	const attach = (hook) => {
		w.__devtool.hook = hook;
		hook.subscribe((/** @type {any} */ event) => w.__devtool.events.push(event));
	};

	if (w.__SVELTEKIT_DEVTOOLS__) attach(w.__SVELTEKIT_DEVTOOLS__);
	else addEventListener('sveltekit:devtools', (e) => attach(/** @type {any} */ (e).detail));
}

test.describe('remote functions devtools hook', () => {
	test('is not present in production builds', async ({ page }) => {
		test.skip(!!process.env.DEV, 'only applicable after build');
		await page.goto('/remote/devtools');
		await expect(page.locator('#todos li')).toHaveText(['Buy groceries']);
		expect(await page.evaluate(() => '__SVELTEKIT_DEVTOOLS__' in window)).toBe(false);
	});

	test("shows a page's queries and a command's effects", async ({ page }) => {
		test.skip(!process.env.DEV, 'dev only');
		await page.addInitScript(devtool);
		await page.goto('/remote/devtools');
		await expect(page.locator('#todos li')).toHaveText(['Buy groceries']);

		/** @returns {Promise<any>} */
		const todos_query = () =>
			page.evaluate(() =>
				/** @type {any} */ (window).__devtool.hook
					.queries()
					.find((/** @type {any} */ q) => q.name === 'get_todos')
			);

		expect(await todos_query()).toMatchObject({
			status: 'ready',
			value: ['Buy groceries'],
			source: 'ssr'
		});

		await page.evaluate(() => (/** @type {any} */ (window).__devtool.events.length = 0));
		await page.locator('#add').click();
		await expect(page.locator('#todos li')).toHaveText(['Buy groceries', 'Walk the dog']);

		const { key } = await todos_query();
		const events = await page.evaluate(() => /** @type {any} */ (window).__devtool.events);
		const started = events.find((/** @type {any} */ e) => e.type === 'mutation:started');

		expect(started).toMatchObject({
			mutation: { type: 'command', name: 'add_todo' },
			arg: 'Walk the dog',
			overrides: [key]
		});
		expect(events.find((/** @type {any} */ e) => e.type === 'mutation:settled')).toMatchObject({
			mutation: started.mutation,
			ok: true,
			result: 2,
			updated: [key]
		});
		expect(await todos_query()).toMatchObject({
			value: ['Buy groceries', 'Walk the dog'],
			source: 'mutation'
		});
	});
});
