import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('embed', () => {
	test('serves embedded components in page', async ({ page, javaScriptEnabled }) => {
		await page.goto('/embed');

		if (javaScriptEnabled) {
			await expect(page.getByTestId('a')).toHaveText('a (browser)');
			await expect(page.getByTestId('b')).toHaveText('b (browser)');
		} else {
			expect(await page.textContent('[data-testid="a"]')).toBe('a (server)');
			expect(await page.textContent('[data-testid="b"]')).toBe('b (server)');
		}
	});

	test('bootstrap script does not throw inside an about:srcdoc iframe', async ({
		page,
		request,
		javaScriptEnabled
	}) => {
		test.skip(!javaScriptEnabled, 'this tests the client bootstrap script');

		// the raw server-rendered HTML, including the inline bootstrap script
		const html = await request.get('/embed').then((response) => response.text());

		// a page with a real (non-opaque) origin so the srcdoc iframe is same-origin
		await page.goto('/embed');

		// inside an <iframe srcdoc> the document's location is about:srcdoc, a
		// non-hierarchical protocol. Relative base paths are not used when
		// embedded, so the bootstrap script should set base to the configured value
		const base = await page.evaluate((srcdoc) => {
			return new Promise((resolve) => {
				const iframe = document.createElement('iframe');
				iframe.srcdoc = srcdoc;
				iframe.addEventListener('load', () => {
					const win = /** @type {any} */ (iframe.contentWindow);
					const key = Object.keys(win).find((k) => k.startsWith('__sveltekit_'));
					resolve(key ? win[key].base : null);
				});
				document.body.appendChild(iframe);
			});
		}, html);

		expect(base).toBe('');
	});
});
