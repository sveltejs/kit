import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.parallel('a11y', () => {
	test('resets focus', async ({ page, clicknav }) => {
		await page.goto('/accessibility/a');

		await clicknav('[href="/accessibility/b"]');
		expect(await page.innerHTML('h1')).toBe('b');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BODY');
		await page.keyboard.press('Tab');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('A');
		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toBe('a');

		await clicknav('[href="/accessibility/a"]');
		expect(await page.innerHTML('h1')).toBe('a');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BODY');
		await page.keyboard.press('Tab');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('A');
		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toBe('a');
	});

	test('announces client-side navigation', async ({ page, clicknav, javaScriptEnabled }) => {
		await page.goto('/accessibility/a');

		const has_live_region = (await page.innerHTML('body')).includes('aria-live');

		if (javaScriptEnabled) {
			expect(has_live_region).toBeTruthy();

			// live region should exist, but be empty
			expect(await page.innerHTML('[aria-live]')).toBe('');

			await clicknav('[href="/accessibility/b"]');
			expect(await page.innerHTML('[aria-live]')).toBe('b'); // TODO i18n
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
			expect(sources[1]).toBe(`${baseURL}/_app/assets/large-3183867c.jpg`);
		}
	});
});

test.describe.parallel('Caching', () => {
	test('caches pages', async ({ request }) => {
		const response = await request.get('/caching');
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});

	test('sets cache-control: private if page uses session', async ({ request }) => {
		const response = await request.get('/caching/private/uses-session');
		expect(response.headers()['cache-control']).toBe('private, max-age=30');
	});

	test('sets cache-control: private if page uses fetch', async ({ request }) => {
		const response = await request.get('/caching/private/uses-fetch?credentials=include');
		expect(response.headers()['cache-control']).toBe('private, max-age=30');
	});

	test('sets cache-control: public if page uses fetch without credentials', async ({ request }) => {
		const response = await request.get('/caching/private/uses-fetch?credentials=omit');
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});
});

test.describe.parallel('Content-Type', () => {
	test('sets Content-Type on page', async ({ request }) => {
		const response = await request.get('/content-type-header');
		expect(response.headers()['content-type']).toBe('text/html');
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
		).toBe('rgb(255, 0, 0)');
	});

	test('applies layout styles', async ({ page }) => {
		await page.goto('/css');

		expect(
			await page.evaluate(() => {
				const el = document.querySelector('footer');
				return el && getComputedStyle(el).color;
			})
		).toBe('rgb(128, 0, 128)');
	});

	test('applies local styles', async ({ page }) => {
		await page.goto('/css');

		expect(
			await page.evaluate(() => {
				const el = document.querySelector('.also-styled');
				return el && getComputedStyle(el).color;
			})
		).toBe('rgb(0, 0, 255)');
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
			).toBe('absolute');
		}
	});
});

test.describe.parallel('Endpoints', () => {
	test('calls a delete handler', async ({ page, javaScriptEnabled }) => {
		if (javaScriptEnabled) {
			await page.goto('/delete-route');
			await page.click('.del');
			expect(await page.innerHTML('h1')).toBe('deleted 42');
		}
	});

	test('not ok on void endpoint', async ({ request }) => {
		const response = await request.delete('/endpoint-output/empty');
		expect(response.ok()).toBe(false);
	});

	test('200 status on empty endpoint', async ({ request }) => {
		const response = await request.get('/endpoint-output/empty');
		expect(response.status()).toBe(200);
		expect(await response.json()).toEqual({});
	});

	test('set-cookie without body', async ({ request }) => {
		const response = await request.get('/endpoint-output/headers');
		expect(response.status()).toBe(200);
		expect(response.headers()['set-cookie']).toBeDefined();
	});

	test('200 status by default', async ({ request }) => {
		const response = await request.get('/endpoint-output/body');
		expect(response.status()).toBe(200);
		expect(await response.text()).toBe('{}');
	});

	// TODO are these tests useful?
	test('always returns a body', async ({ request }) => {
		const response = await request.get('/endpoint-output/empty');
		expect(typeof (await response.body())).toEqual('object');
	});

	test('null body returns null json value', async ({ request }) => {
		const response = await request.get('/endpoint-output/null');
		expect(response.status()).toBe(200);
		expect(await response.json()).toBe(null);
	});

	test('gets string response with XML Content-Type', async ({ request }) => {
		const response = await request.get('/endpoint-output/xml-text');

		expect(response.headers()['content-type']).toBe('application/xml');
		expect(await response.text()).toBe('<foo />');
	});

	test('gets binary response with XML Content-Type', async ({ request }) => {
		const response = await request.get('/endpoint-output/xml-bytes');

		expect(response.headers()['content-type']).toBe('application/xml');
		expect(await response.text()).toBe('<foo />');
	});
});

test.describe.parallel('Encoded paths', () => {
	test('visits a route with non-ASCII character', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/苗条"]');
		expect(await page.innerHTML('h1')).toBe('static');
		expect(decodeURI(await page.innerHTML('h2'))).toBe('/encoded/苗条');
		expect(decodeURI(await page.innerHTML('h3'))).toBe('/encoded/苗条');
	});

	test('visits a route with a doubly encoded space', async ({ page }) => {
		await page.goto('/encoded/test%2520me');
		expect(await page.innerHTML('h2')).toBe('/encoded/test%2520me: test%20me');
		expect(await page.innerHTML('h3')).toBe('/encoded/test%2520me: test%20me');
	});

	test('visits a route with an encoded slash', async ({ page }) => {
		await page.goto('/encoded/AC%2fDC');
		expect(await page.innerHTML('h2')).toBe('/encoded/AC%2fDC: AC/DC');
		expect(await page.innerHTML('h3')).toBe('/encoded/AC%2fDC: AC/DC');
	});

	test('visits a route with an encoded bracket', async ({ page }) => {
		await page.goto('/encoded/%5b');
		expect(await page.innerHTML('h2')).toBe('/encoded/%5b: [');
		expect(await page.innerHTML('h3')).toBe('/encoded/%5b: [');
	});

	test('visits a route with an encoded question mark', async ({ page }) => {
		await page.goto('/encoded/%3f');
		expect(await page.innerHTML('h2')).toBe('/encoded/%3f: ?');
		expect(await page.innerHTML('h3')).toBe('/encoded/%3f: ?');
	});

	test('visits a dynamic route with non-ASCII character', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/土豆"]');
		expect(await page.innerHTML('h1')).toBe('dynamic');
		expect(decodeURI(await page.innerHTML('h2'))).toBe('/encoded/土豆: 土豆');
		expect(decodeURI(await page.innerHTML('h3'))).toBe('/encoded/土豆: 土豆');
	});

	test('redirects correctly with non-ASCII location', async ({ page, clicknav }) => {
		await page.goto('/encoded');

		await clicknav('[href="/encoded/反应"]');

		expect(await page.innerHTML('h1')).toBe('static');
		expect(decodeURI(await page.innerHTML('h2'))).toBe('/encoded/苗条');
		expect(decodeURI(await page.innerHTML('h3'))).toBe('/encoded/苗条');
	});

	test('sets charset on JSON Content-Type', async ({ request }) => {
		const response = await request.get('/encoded/endpoint');
		expect(response.headers()['content-type']).toBe('application/json; charset=utf-8');
	});
});

test.describe('Errors', () => {
	if (process.env.DEV) {
		// TODO these probably shouldn't have the full render treatment,
		// given that they will never be user-visible in prod
		test('server-side errors', async ({ page }) => {
			await page.goto('/errors/serverside');

			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "Crashing now"'
			);
		});

		test('server-side module context errors', async ({ page }) => {
			await page.goto('/errors/module-scope-server');

			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "Crashing now"'
			);
		});
	}

	test('client-side load errors', async ({ page, javaScriptEnabled }) => {
		await page.goto('/errors/load-client');

		if (javaScriptEnabled) {
			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "Crashing now"'
			);
		}
	});

	test('server-side load errors', async ({ page }) => {
		await page.goto('/errors/load-server');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Crashing now"'
		);

		expect(
			await page.evaluate(() => {
				const el = document.querySelector('h1');
				return el && getComputedStyle(el).color;
			})
		).toBe('rgb(255, 0, 0)');
	});

	test('client-side module context errors', async ({ page, javaScriptEnabled }) => {
		await page.goto('/errors/module-scope-client');

		if (javaScriptEnabled) {
			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "Crashing now"'
			);
		}
	});

	test('404', async ({ page }) => {
		const response = await page.goto('/why/would/anyone/fetch/this/url');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Not found: /why/would/anyone/fetch/this/url"'
		);
		expect(response.status()).toBe(404);
	});

	test('server-side error from load() is a string', async ({ page }) => {
		const response = await page.goto('/errors/load-error-string-server');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Not found"'
		);
		expect(response.status()).toBe(555);
	});

	test('client-side error from load() is a string', async ({ page, javaScriptEnabled }) => {
		await page.goto('/errors/load-error-string-client');

		if (javaScriptEnabled) {
			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "Not found"'
			);
			expect(await page.innerHTML('h1')).toBe('555');
		}
	});

	test('server-side error from load() is an Error', async ({ page }) => {
		const response = await page.goto('/errors/load-error-server');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Not found"'
		);
		expect(response.status()).toBe(555);
	});

	test('client-side error from load() is an Error', async ({ page, javaScriptEnabled }) => {
		await page.goto('/errors/load-error-client');

		if (javaScriptEnabled) {
			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "Not found"'
			);
			expect(await page.innerHTML('h1')).toBe('555');
		}
	});

	test('server-side error from load() is malformed', async ({ page }) => {
		await page.goto('/errors/load-error-malformed-server');

		const body = await page.textContent('body');

		expect(body).toMatch(
			'Error: "error" property returned from load() must be a string or instance of Error, received type "object"'
		);
	});

	test('client-side error from load() is malformed', async ({ page, javaScriptEnabled }) => {
		await page.goto('/errors/load-error-malformed-client');

		if (javaScriptEnabled) {
			const body = await page.textContent('body');

			expect(body).toMatch(
				'Error: "error" property returned from load() must be a string or instance of Error, received type "object"'
			);
		}
	});

	test('invalid route response is handled', async ({ request }) => {
		const response = await request.get('/errors/invalid-route-response');

		expect(response.status()).toBe(500);
		expect(await response.text()).toMatch('expected an object');
	});

	// TODO before we implemented route fallthroughs, and there was a 1:1
	// regex:route relationship, it was simple to say 'method not implemented
	// for this endpoint'. now it's a little tricker. does a 404 suffice?
	test.skip('unhandled http method', async ({ request }) => {
		const response = await request.put('/errors/invalid-route-response');

		expect(response.status()).toBe(501);
		expect(await response.text()).toMatch('PUT is not implemented');
	});

	test('error in endpoint', async ({ page, read_errors }) => {
		const res = await page.goto('/errors/endpoint');

		// should include stack trace
		const lines = read_errors('/errors/endpoint.json').split('\n');
		expect(lines[0]).toMatch('nope');

		if (process.env.DEV) {
			expect(lines[1]).toMatch('endpoint.json');
		}

		expect(res && res.status()).toBe(500);
		expect(await page.textContent('#message')).toBe('This is your custom error page saying: ""');

		const contents = await page.textContent('#stack');
		const location = 'endpoint.svelte:12:15';

		if (process.env.DEV) {
			expect(contents).toMatch(location);
		} else {
			expect(contents).not.toMatch(location);
		}
	});

	test('server-side 4xx status without error from load()', async ({ page }) => {
		const response = await page.goto('/errors/load-status-without-error-server');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe('This is your custom error page saying: ""');
		expect(response.status()).toBe(401);
	});

	test('client-side 4xx status without error from load()', async ({ page, javaScriptEnabled }) => {
		await page.goto('/errors/load-status-without-error-client');

		if (javaScriptEnabled) {
			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe('This is your custom error page saying: ""');
			expect(await page.innerHTML('h1')).toBe('401');
		}
	});
});
