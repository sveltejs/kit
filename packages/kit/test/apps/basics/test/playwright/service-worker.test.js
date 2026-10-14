import process from 'node:process';
import { test } from '../../../../utils.js';
import { expect } from '../../../../playwright-matchers.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);
test.skip(!!process.env.DEV, 'Deployment recovery requires a production build');
// Avoid interference from the app's automatically registered, caching service worker.
test.use({ serviceWorkers: 'block' });

for (const expected of [false, true]) {
	for (const outcome of [
		'lookup throws',
		'lookup rejects',
		'update rejects',
		'no registration',
		'update succeeds'
	]) {
		test(`recovers from ${expected ? 'navigation error' : 'route load failure'} when service worker ${outcome}`, async ({
			page
		}) => {
			/** @type {Error[]} */
			const errors = [];
			page.on('pageerror', (error) => errors.push(error));
			await page.goto('/');
			await page.route('**/_app/version.json', (route) =>
				route.fulfill({ json: { version: 'new-deployment' } })
			);

			await page.evaluate(
				({ outcome, expected }) => {
					navigator.serviceWorker.getRegistration = (scope) => {
						sessionStorage.setItem('worker_scope', String(scope));
						if (outcome === 'lookup throws') {
							throw new TypeError('Service worker lookup failed');
						}
						if (outcome === 'lookup rejects') {
							return Promise.reject(new TypeError('Service worker lookup failed'));
						}
						if (outcome === 'no registration') return Promise.resolve(undefined);
						const registration = /** @type {ServiceWorkerRegistration} */ ({
							update: async () => {
								sessionStorage.setItem('worker_update', 'started');
								if (outcome === 'update rejects')
									throw new TypeError('Service worker update failed');
								await new Promise((resolve) => {
									window.addEventListener('finish-worker-update', resolve, { once: true });
								});
								sessionStorage.setItem('worker_update', 'finished');
								return registration;
							}
						});
						return Promise.resolve(registration);
					};
					const link = document.createElement('a');
					link.href = '/service-worker-recovery' + (expected ? '?expected' : '');
					link.textContent = 'Recover';
					link.dataset.sveltekitPreloadData = 'off';
					document.body.append(link);
				},
				{ outcome, expected }
			);

			const response = page.waitForResponse((response) => response.request().isNavigationRequest());
			await page.getByRole('link', { name: 'Recover', exact: true }).click();
			if (outcome === 'update succeeds') {
				await page.waitForFunction(() => sessionStorage.getItem('worker_update') === 'started');
				// A successful update must still be awaited before leaving the current document.
				expect(new URL(page.url()).pathname).toBe('/');
				await page.evaluate(() => window.dispatchEvent(new Event('finish-worker-update')));
			}
			expect((await response).status()).toBe(200);
			await expect(page.locator('h1')).toHaveText('Recovered through document navigation');
			await expect(page.locator('body')).toHaveClass(/\bstarted\b/);
			expect(await page.evaluate(() => sessionStorage.getItem('worker_scope'))).toBe('/');
			expect(await page.evaluate(() => sessionStorage.getItem('worker_update'))).toBe(
				outcome === 'update succeeds' ? 'finished' : outcome === 'update rejects' ? 'started' : null
			);
			expect(errors).toEqual([]);
		});
	}
}
