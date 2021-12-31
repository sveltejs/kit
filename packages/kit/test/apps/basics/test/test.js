import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.parallel('a11y', () => {
	test('resets focus', async ({ page, clicknav }) => {
		await page.goto('/accessibility/a');

		await clicknav('[href="/accessibility/b"]');
		expect(await page.innerHTML('h1')).toEqual('b');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toEqual('BODY');
		await page.keyboard.press('Tab');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toEqual('A');
		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toEqual('a');

		await clicknav('[href="/accessibility/a"]');
		expect(await page.innerHTML('h1')).toEqual('a');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toEqual('BODY');
		await page.keyboard.press('Tab');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toEqual('A');
		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toEqual('a');
	});

	test('announces client-side navigation', async ({ page, clicknav, javaScriptEnabled }) => {
		await page.goto('/accessibility/a');

		const has_live_region = (await page.innerHTML('body')).includes('aria-live');

		if (javaScriptEnabled) {
			expect(has_live_region).toBeTruthy();

			// live region should exist, but be empty
			expect(await page.innerHTML('[aria-live]')).toEqual('');

			await clicknav('[href="/accessibility/b"]');
			expect(await page.innerHTML('[aria-live]')).toEqual('b'); // TODO i18n
		} else {
			expect(has_live_region).toBeFalsy();
		}
	});
});

test.describe.parallel('URL fragments', () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

	test('url-supplied anchor works on direct page load', async ({ page, is_in_viewport }) => {
		await page.goto('/anchor/anchor#go-to-element');
		expect(await is_in_viewport('#go-to-element')).toBeTruthy();
	});

	test('url-supplied anchor works on navigation to page', async ({
		page,
		is_in_viewport,
		clicknav
	}) => {
		await page.goto('/anchor');
		await clicknav('#first-anchor');
		expect(await is_in_viewport('#go-to-element')).toBeTruthy();
	});

	test('url-supplied anchor works when navigated from scrolled page', async ({
		page,
		clicknav,
		is_in_viewport
	}) => {
		await page.goto('/anchor');
		await clicknav('#second-anchor');
		expect(await is_in_viewport('#go-to-element')).toBeTruthy();
	});

	test('no-anchor url will scroll to top when navigated from scrolled page', async ({
		page,
		clicknav
	}) => {
		await page.goto('/anchor');
		await clicknav('#third-anchor');
		expect(await page.evaluate(() => pageYOffset === 0)).toBeTruthy();
	});

	test('url-supplied anchor works when navigated from bottom of page', async ({
		page,
		clicknav,
		is_in_viewport
	}) => {
		await page.goto('/anchor');
		await clicknav('#last-anchor');
		expect(await is_in_viewport('#go-to-element')).toBeTruthy();
	});

	test('no-anchor url will scroll to top when navigated from bottom of page', async ({
		clicknav,
		page
	}) => {
		await page.goto('/anchor');
		await clicknav('#last-anchor-2');
		expect(await page.evaluate(() => pageYOffset === 0)).toBeTruthy;
	});

	test('url-supplied anchor is ignored with onMount() scrolling on direct page load', async ({
		page,
		is_in_viewport
	}) => {
		await page.goto('/anchor-with-manual-scroll/anchor#go-to-element');
		expect(await is_in_viewport('#abcde')).toBeTruthy();
	});

	test('url-supplied anchor is ignored with onMount() scrolling on navigation to page', async ({
		page,
		clicknav,
		is_in_viewport
	}) => {
		await page.goto('/anchor-with-manual-scroll');
		await clicknav('[href="/anchor-with-manual-scroll/anchor#go-to-element"]');
		expect(await is_in_viewport('#abcde')).toBeTruthy();
	});
});

// https://github.com/sveltejs/kit/issues/461
test.describe.parallel('Asset imports', () => {
	test('handles static asset imports', async ({ baseURL, page }) => {
		await page.goto('/asset-import');

		const sources = await page.evaluate(() =>
			[...document.querySelectorAll('img')].map((img) => img.src)
		);

		if (process.env.DEV) {
			expect(sources).toEqual([
				`${baseURL}/src/routes/asset-import/small.png`,
				`${baseURL}/src/routes/asset-import/large.jpg`
			]);
		} else {
			expect(sources[0].startsWith('data:image/png;base64,')).toBeTruthy();
			expect(sources[1]).toEqual(`${baseURL}/_app/assets/large-3183867c.jpg`);
		}
	});
});

test.describe.parallel('Caching', () => {
	test('caches pages', async ({ request }) => {
		const response = await request.get('/caching');
		expect(response.headers()['cache-control']).toEqual('public, max-age=30');
	});

	test('sets cache-control: private if page uses session', async ({ request }) => {
		const response = await request.get('/caching/private/uses-session');
		expect(response.headers()['cache-control']).toEqual('private, max-age=30');
	});

	test('sets cache-control: private if page uses fetch', async ({ request }) => {
		const response = await request.get('/caching/private/uses-fetch?credentials=include');
		expect(response.headers()['cache-control']).toEqual('private, max-age=30');
	});

	test('sets cache-control: public if page uses fetch without credentials', async ({ request }) => {
		const response = await request.get('/caching/private/uses-fetch?credentials=omit');
		expect(response.headers()['cache-control']).toEqual('public, max-age=30');
	});
});

test.describe.parallel('Content-Type', () => {
	test('sets Content-Type on page', async ({ request }) => {
		const response = await request.get('/content-type-header');
		expect(response.headers()['content-type']).toEqual('text/html');
	});
});

test.describe.parallel('CSS', () => {
	test('applies imported styles', async ({ page }) => {
		await page.goto('/css');

		expect(
			await page.evaluate(() => {
				const el = document.querySelector('.styled');
				return el && getComputedStyle(el).color;
			})
		).toEqual('rgb(255, 0, 0)');
	});

	test('applies layout styles', async ({ page }) => {
		await page.goto('/css');

		expect(
			await page.evaluate(() => {
				const el = document.querySelector('footer');
				return el && getComputedStyle(el).color;
			})
		).toEqual('rgb(128, 0, 128)');
	});

	test('applies local styles', async ({ page }) => {
		await page.goto('/css');

		expect(
			await page.evaluate(() => {
				const el = document.querySelector('.also-styled');
				return el && getComputedStyle(el).color;
			})
		).toEqual('rgb(0, 0, 255)');
	});

	test('applies generated component styles (hides announcer)', async ({
		page,
		clicknav,
		javaScriptEnabled
	}) => {
		await page.goto('/css');

		if (javaScriptEnabled) {
			await clicknav('[href="/css/other"]');

			expect(
				await page.evaluate(() => {
					const el = document.querySelector('#svelte-announcer');
					return el && getComputedStyle(el).position;
				})
			).toEqual('absolute');
		}
	});
});

test.describe.parallel('Endpoints', () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

	test('calls a delete handler', async ({ page, javaScriptEnabled }) => {
		await page.goto('/delete-route');
		await page.click('.del');
		expect(await page.innerHTML('h1')).toEqual('deleted 42');
	});
});

test.describe.parallel('Encoded paths', () => {
	test('visits a route with non-ASCII character', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/苗条"]');
		expect(await page.innerHTML('h1')).toEqual('static');
		expect(decodeURI(await page.innerHTML('h2'))).toEqual('/encoded/苗条');
		expect(decodeURI(await page.innerHTML('h3'))).toEqual('/encoded/苗条');
	});

	test('visits a route with a doubly encoded space', async ({ page }) => {
		await page.goto('/encoded/test%2520me');
		expect(await page.innerHTML('h2')).toEqual('/encoded/test%2520me: test%20me');
		expect(await page.innerHTML('h3')).toEqual('/encoded/test%2520me: test%20me');
	});

	test('visits a route with an encoded slash', async ({ page }) => {
		await page.goto('/encoded/AC%2fDC');
		expect(await page.innerHTML('h2')).toEqual('/encoded/AC%2fDC: AC/DC');
		expect(await page.innerHTML('h3')).toEqual('/encoded/AC%2fDC: AC/DC');
	});

	test('visits a route with an encoded bracket', async ({ page }) => {
		await page.goto('/encoded/%5b');
		expect(await page.innerHTML('h2')).toEqual('/encoded/%5b: [');
		expect(await page.innerHTML('h3')).toEqual('/encoded/%5b: [');
	});

	test('visits a route with an encoded question mark', async ({ page }) => {
		await page.goto('/encoded/%3f');
		expect(await page.innerHTML('h2')).toEqual('/encoded/%3f: ?');
		expect(await page.innerHTML('h3')).toEqual('/encoded/%3f: ?');
	});

	test('visits a dynamic route with non-ASCII character', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/土豆"]');
		expect(await page.innerHTML('h1')).toEqual('dynamic');
		expect(decodeURI(await page.innerHTML('h2'))).toEqual('/encoded/土豆: 土豆');
		expect(decodeURI(await page.innerHTML('h3'))).toEqual('/encoded/土豆: 土豆');
	});

	test('redirects correctly with non-ASCII location', async ({ page, clicknav }) => {
		await page.goto('/encoded');

		await clicknav('[href="/encoded/反应"]');

		expect(await page.innerHTML('h1')).toEqual('static');
		expect(decodeURI(await page.innerHTML('h2'))).toEqual('/encoded/苗条');
		expect(decodeURI(await page.innerHTML('h3'))).toEqual('/encoded/苗条');
	});

	test('sets charset on JSON Content-Type', async ({ request }) => {
		const response = await request.get('/encoded/endpoint');
		expect(response.headers()['content-type']).toEqual('application/json; charset=utf-8');
	});
});
