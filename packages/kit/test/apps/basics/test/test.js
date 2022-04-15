import fs from 'fs';
import path from 'path';
import http from 'http';
import * as ports from 'port-authority';
import { expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { start_server, test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

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

		expect(await page.evaluate(() => document.documentElement.getAttribute('tabindex'))).toBe(null);
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

	test('keepfocus works', async ({ page, javaScriptEnabled }) => {
		await page.goto('/keepfocus');

		if (javaScriptEnabled) {
			await Promise.all([
				page.type('#input', 'bar'),
				page.waitForFunction(() => window.location.search === '?foo=bar')
			]);
			await expect(page.locator('#input')).toBeFocused();
		}
	});

	test('reset selection', async ({ page, clicknav }) => {
		await page.goto('/selection/a');

		expect(
			await page.evaluate(() => {
				const range = document.createRange();
				range.selectNodeContents(document.body);
				const selection = getSelection();
				if (selection) {
					selection.removeAllRanges();
					selection.addRange(range);
					return selection.rangeCount;
				}
				return 0;
			})
		).toBe(1);

		await clicknav('[href="/selection/b"]');
		expect(
			await page.evaluate(() => {
				const selection = getSelection();
				if (selection) {
					return selection.rangeCount;
				}
				return 1;
			})
		).toBe(0);
	});
});

test.describe.parallel('afterNavigate', () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

	test('calls callback', async ({ page, clicknav }) => {
		await page.goto('/after-navigate/a');
		expect(await page.textContent('h1')).toBe('undefined -> /after-navigate/a');

		await clicknav('[href="/after-navigate/b"]');
		expect(await page.textContent('h1')).toBe('/after-navigate/a -> /after-navigate/b');
	});
});

test.describe.parallel('beforeNavigate', () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

	test('prevents navigation triggered by link click', async ({ clicknav, page, baseURL }) => {
		await page.goto('/before-navigate/prevent-navigation');

		try {
			await clicknav('[href="/before-navigate/a"]', { timeout: 1000 });
			expect(false).toBe(true);
		} catch (/** @type {any} */ e) {
			expect(e.message).toMatch('page.waitForNavigation: Timeout 1000ms exceeded');
		}

		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('true');
	});

	test('prevents navigation triggered by goto', async ({ page, app, baseURL }) => {
		await page.goto('/before-navigate/prevent-navigation');
		await app.goto('/before-navigate/a');
		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('true');
	});

	test('prevents navigation triggered by back button', async ({ page, app, baseURL }) => {
		await page.goto('/before-navigate/a');

		await app.goto('/before-navigate/prevent-navigation');
		await page.goBack();
		expect(page.url()).toBe(baseURL + '/before-navigate/prevent-navigation');
		expect(await page.innerHTML('pre')).toBe('true');
	});

	test('prevents unload', async ({ page }) => {
		await page.goto('/before-navigate/prevent-navigation');

		const type = new Promise((fulfil) => {
			page.on('dialog', async (dialog) => {
				fulfil(dialog.type());
				await dialog.dismiss();
			});
		});

		await page.close({ runBeforeUnload: true });
		expect(await type).toBe('beforeunload');
	});
});

test.describe('Scrolling', () => {
	// skip these tests if JS is disabled, since we're testing client-side behaviour
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

	test('url-supplied anchor works on direct page load', async ({ page, in_view }) => {
		await page.goto('/anchor/anchor#go-to-element');
		expect(await in_view('#go-to-element')).toBe(true);
	});

	test('url-supplied anchor works on navigation to page', async ({ page, in_view, clicknav }) => {
		await page.goto('/anchor');
		await clicknav('#first-anchor');
		expect(await in_view('#go-to-element')).toBe(true);
	});

	test('url-supplied anchor works when navigated from scrolled page', async ({
		page,
		clicknav,
		in_view
	}) => {
		await page.goto('/anchor');
		await clicknav('#second-anchor');
		expect(await in_view('#go-to-element')).toBe(true);
	});

	test('no-anchor url will scroll to top when navigated from scrolled page', async ({
		page,
		clicknav
	}) => {
		await page.goto('/anchor');
		await clicknav('#third-anchor');
		expect(await page.evaluate(() => scrollY === 0)).toBeTruthy();
	});

	test('url-supplied anchor works when navigated from bottom of page', async ({
		page,
		clicknav,
		in_view
	}) => {
		await page.goto('/anchor');
		await clicknav('#last-anchor');
		expect(await in_view('#go-to-element')).toBe(true);
	});

	test('no-anchor url will scroll to top when navigated from bottom of page', async ({
		clicknav,
		page
	}) => {
		await page.goto('/anchor');
		await clicknav('#last-anchor-2');
		expect(await page.evaluate(() => scrollY === 0)).toBeTruthy();
	});

	test('scroll is restored after hitting the back button', async ({
		back,
		baseURL,
		clicknav,
		page
	}) => {
		await page.goto('/anchor');
		await page.click('#scroll-anchor');
		const originalScrollY = /** @type {number} */ (await page.evaluate(() => scrollY));
		await clicknav('#routing-page');
		await back();
		expect(page.url()).toBe(baseURL + '/anchor#last-anchor-2');
		expect(await page.evaluate(() => scrollY)).toEqual(originalScrollY);

		await page.goBack();
		expect(page.url()).toBe(baseURL + '/anchor');
		expect(await page.evaluate(() => scrollY)).toEqual(0);
	});

	test('url-supplied anchor is ignored with onMount() scrolling on direct page load', async ({
		page,
		in_view
	}) => {
		await page.goto('/anchor-with-manual-scroll/anchor#go-to-element');
		expect(await in_view('#abcde')).toBe(true);
	});

	test('url-supplied anchor is ignored with onMount() scrolling on navigation to page', async ({
		page,
		clicknav,
		javaScriptEnabled,
		in_view
	}) => {
		await page.goto('/anchor-with-manual-scroll');
		await clicknav('[href="/anchor-with-manual-scroll/anchor#go-to-element"]');
		if (javaScriptEnabled) expect(await in_view('#abcde')).toBe(true);
		else expect(await in_view('#go-to-element')).toBe(true);
	});

	test('app-supplied scroll and focus work on direct page load', async ({ page, in_view }) => {
		await page.goto('/use-action/focus-and-scroll');
		expect(await in_view('#input')).toBe(true);
		await expect(page.locator('#input')).toBeFocused();
	});

	test('app-supplied scroll and focus work on navigation to page', async ({
		page,
		clicknav,
		in_view
	}) => {
		await page.goto('/use-action');
		await clicknav('[href="/use-action/focus-and-scroll"]');
		expect(await in_view('#input')).toBe(true);
		await expect(page.locator('input')).toBeFocused();
	});

	test('scroll positions are recovered on reloading the page', async ({ page, back, app }) => {
		await page.goto('/anchor');
		await page.evaluate(() => window.scrollTo(0, 1000));
		await app.goto('/anchor/anchor');
		await page.evaluate(() => window.scrollTo(0, 1000));

		await page.reload();
		expect(await page.evaluate(() => window.scrollY)).toBe(1000);

		await back();
		expect(await page.evaluate(() => window.scrollY)).toBe(1000);
	});
});

test.describe.parallel('Imports', () => {
	test('imports from node_modules', async ({ page, clicknav }) => {
		await page.goto('/imports');
		await clicknav('[href="/imports/markdown"]');
		expect(await page.innerHTML('p')).toBe('this is some <strong>markdown</strong>');
	});

	// https://github.com/sveltejs/kit/issues/461
	test('handles static asset imports', async ({ baseURL, page }) => {
		await page.goto('/asset-import');

		const sources = await page.evaluate(() =>
			Array.from(document.querySelectorAll('img'), (img) => img.src)
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

	test('sets cache-control: private if page uses session in load', async ({ request }) => {
		const response = await request.get('/caching/private/uses-session-in-load');
		expect(response.headers()['cache-control']).toBe('private, max-age=30');
	});

	test('sets cache-control: private if page uses session in init', async ({ request }) => {
		const response = await request.get('/caching/private/uses-session-in-init');
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

test.describe.parallel('Shadowed pages', () => {
	test('Loads props from an endpoint', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/simple"]');
		expect(await page.textContent('h1')).toBe('The answer is 42');
	});

	test('Handles GET redirects', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/redirect-get"]');
		expect(await page.textContent('h1')).toBe('Redirection was successful');
	});

	test('Handles GET redirects with cookies', async ({ page, context, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/redirect-get-with-cookie"]');
		expect(await page.textContent('h1')).toBe('Redirection was successful');

		const cookies = await context.cookies();
		expect(cookies).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'shadow-redirect', value: 'happy' })])
		);
	});

	test('Handles POST redirects', async ({ page }) => {
		await page.goto('/shadowed');
		await Promise.all([page.waitForNavigation(), page.click('#redirect-post')]);
		expect(await page.textContent('h1')).toBe('Redirection was successful');
	});

	test('Handles POST redirects with cookies', async ({ page, context }) => {
		await page.goto('/shadowed');
		await Promise.all([page.waitForNavigation(), page.click('#redirect-post-with-cookie')]);
		expect(await page.textContent('h1')).toBe('Redirection was successful');

		const cookies = await context.cookies();
		expect(cookies).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'shadow-redirect', value: 'happy' })])
		);
	});

	test('Renders error page for 4xx and 5xx responses from GET', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/error-get"]');
		expect(await page.textContent('h1')).toBe('404');
	});

	test('Merges bodies for 4xx and 5xx responses from non-GET', async ({ page }) => {
		await page.goto('/shadowed');
		await Promise.all([page.waitForNavigation(), page.click('#error-post')]);
		expect(await page.textContent('h1')).toBe('hello from get / hello from post');
	});

	test('Responds from endpoint if Accept includes application/json but not text/html', async ({
		request
	}) => {
		const response = await request.get('/shadowed/simple', {
			headers: {
				accept: 'application/json'
			}
		});

		expect(await response.json()).toEqual({ answer: 42 });
	});

	test('Endpoint receives consistent URL', async ({ baseURL, page, clicknav }) => {
		await page.goto('/shadowed/same-render-entry');
		await clicknav('[href="/shadowed/same-render?param1=value1"]');
		expect(await page.textContent('h1')).toBe(`URL: ${baseURL}/shadowed/same-render?param1=value1`);
	});

	test('responds to HEAD requests from endpoint', async ({ request }) => {
		const url = '/shadowed/simple';

		const opts = {
			headers: {
				accept: 'application/json'
			}
		};

		const responses = {
			head: await request.head(url, opts),
			get: await request.get(url, opts)
		};

		const headers = {
			head: responses.head.headers(),
			get: responses.get.headers()
		};

		expect(responses.head.status()).toBe(200);
		expect(responses.get.status()).toBe(200);
		expect(await responses.head.text()).toBe('');
		expect(await responses.get.json()).toEqual({ answer: 42 });

		['date', 'transfer-encoding'].forEach((name) => {
			delete headers.head[name];
			delete headers.get[name];
		});

		expect(headers.head).toEqual(headers.get);
	});

	test('Works with missing get handler', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/no-get"]');
		expect(await page.textContent('h1')).toBe('hello');
	});

	test('Invalidates shadow data when URL changes', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/dynamic/foo"]');
		expect(await page.textContent('h1')).toBe('slug: foo');

		await clicknav('[href="/shadowed/dynamic/bar"]');
		expect(await page.textContent('h1')).toBe('slug: bar');

		await page.goto('/shadowed/dynamic/foo');
		expect(await page.textContent('h1')).toBe('slug: foo');
		await clicknav('[href="/shadowed/dynamic/bar"]');
		expect(await page.textContent('h1')).toBe('slug: bar');
	});

	test('Shadow redirect', async ({ page, clicknav }) => {
		await page.goto('/shadowed/redirect');
		await clicknav('[href="/shadowed/redirect/a"]');
		expect(await page.textContent('h1')).toBe('done');
	});

	test('Endpoint without GET', async ({ page, clicknav, baseURL, javaScriptEnabled }) => {
		await page.goto('/shadowed');

		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await clicknav('[href="/shadowed/missing-get"]');

		expect(await page.textContent('h1')).toBe('post without get');

		// check that the router didn't fall back to the server
		if (javaScriptEnabled) {
			expect(requests).not.toContain(`${baseURL}/shadowed/missing-get`);
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

	test('200 status on empty endpoint', async ({ request }) => {
		const response = await request.get('/endpoint-output/empty');
		expect(/** @type {import('@playwright/test').APIResponse} */ (response).status()).toBe(200);
		expect(await response.json()).toEqual({});
	});

	test('set-cookie without body', async ({ request }) => {
		const response = await request.get('/endpoint-output/headers');
		expect(/** @type {import('@playwright/test').APIResponse} */ (response).status()).toBe(200);
		expect(response.headers()['set-cookie']).toBeDefined();
	});

	test('HEAD with matching headers but without body', async ({ request }) => {
		const url = '/endpoint-output/body';

		const responses = {
			head: await request.head(url),
			get: await request.get(url)
		};

		const headers = {
			head: responses.head.headers(),
			get: responses.get.headers()
		};

		expect(responses.head.status()).toBe(200);
		expect(responses.get.status()).toBe(200);
		expect(await responses.head.text()).toBe('');
		expect(await responses.get.text()).toBe('{}');

		['date', 'transfer-encoding'].forEach((name) => {
			delete headers.head[name];
			delete headers.get[name];
		});

		expect(headers.head).toEqual(headers.get);
	});

	test('200 status by default', async ({ request }) => {
		const response = await request.get('/endpoint-output/body');
		expect(/** @type {import('@playwright/test').APIResponse} */ (response).status()).toBe(200);
		expect(await response.text()).toBe('{}');
	});

	// TODO are these tests useful?
	test('always returns a body', async ({ request }) => {
		const response = await request.get('/endpoint-output/empty');
		expect(typeof (await response.body())).toEqual('object');
	});

	test('null body returns null json value', async ({ request }) => {
		const response = await request.get('/endpoint-output/null');
		expect(/** @type {import('@playwright/test').APIResponse} */ (response).status()).toBe(200);
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

	test('allows headers to be a Headers object', async ({ request }) => {
		const response = await request.get('/endpoint-output/headers-object');

		expect(response.headers()['x-foo']).toBe('bar');
	});

	test('allows return value to be a Response', async ({ request }) => {
		const { server, port } = await start_server((req, res) => {
			res.writeHead(200, {
				'X-Foo': 'bar'
			});

			res.end('ok');
		});

		try {
			const response = await request.get(`/endpoint-output/proxy?port=${port}`);

			expect(await response.text()).toBe('ok');
			expect(response.headers()['x-foo']).toBe('bar');
		} finally {
			server.close();
		}
	});

	test('multiple set-cookie on endpoints using GET', async ({ request }) => {
		const response = await request.get('/set-cookie');

		const cookies = response
			.headersArray()
			.filter((obj) => obj.name === 'set-cookie')
			.map((obj) => obj.value);

		expect(cookies).toEqual([
			'answer=42; HttpOnly',
			'problem=comma, separated, values; HttpOnly',
			'name=SvelteKit; path=/; HttpOnly'
		]);
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

	test('redirects do not re-encode the redirect string', async ({ page, clicknav }) => {
		await page.goto('/encoded');

		await clicknav('[href="/encoded/redirect"]');

		// check innerText instead of innerHTML because innerHTML would return the '&amp;' character reference instead of '&' character.
		expect(await page.innerText('pre')).toBe('/苗条?foo=bar&fizz=buzz');
	});

	test('redirects do not re-encode the redirect string during ssr', async ({ page }) => {
		await page.goto('/encoded/redirect');

		// check innerText instead of innerHTML because innerHTML would return the '&amp;' character reference instead of '&' character.
		expect(await page.innerText('pre')).toBe('/苗条?foo=bar&fizz=buzz');
	});

	test('sets charset on JSON Content-Type', async ({ request }) => {
		const response = await request.get('/encoded/endpoint');
		expect(response.headers()['content-type']).toBe('application/json; charset=utf-8');
	});
});

test.describe.parallel('Errors', () => {
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
			test.fixme();

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
		expect(/** @type {Response} */ (response).status()).toBe(404);
	});

	test('server-side error from load() is a string', async ({ page }) => {
		const response = await page.goto('/errors/load-error-string-server');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Not found"'
		);
		expect(/** @type {Response} */ (response).status()).toBe(555);
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
		expect(/** @type {Response} */ (response).status()).toBe(555);
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

		expect(/** @type {import('@playwright/test').APIResponse} */ (response).status()).toBe(500);
		expect(await response.text()).toMatch('expected an object');
	});

	// TODO before we implemented route fallthroughs, and there was a 1:1
	// regex:route relationship, it was simple to say 'method not implemented
	// for this endpoint'. now it's a little tricker. does a 404 suffice?
	test('unhandled http method', async ({ request }) => {
		const response = await request.put('/errors/invalid-route-response');

		expect(response.status()).toBe(405);
		expect(await response.text()).toMatch('PUT method not allowed');
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
		const location = /endpoint\.svelte:12:9|endpoint\.svelte:12:15/; // TODO: Remove second location with Vite 2.9

		if (process.env.DEV) {
			expect(contents).toMatch(location);
		} else {
			expect(contents).not.toMatch(location);
		}
	});

	test('not ok response from endpoint', async ({ page, read_errors }) => {
		const res = await page.goto('/errors/endpoint-not-ok');

		expect(read_errors('/errors/endpoint-not-ok.json')).toBeUndefined();

		expect(res && res.status()).toBe(555);
		expect(await page.textContent('#message')).toBe('This is your custom error page saying: ""');

		const contents = await page.textContent('#stack');
		const location = /endpoint-not-ok\.svelte:12:9|endpoint-not-ok\.svelte:12:15/; // TODO: Remove second location with Vite 2.9

		if (process.env.DEV) {
			expect(contents).toMatch(location);
		} else {
			expect(contents).not.toMatch(location);
		}
	});

	test('error in shadow endpoint', async ({ page, read_errors }) => {
		const res = await page.goto('/errors/endpoint-shadow');

		// should include stack trace
		const lines = read_errors('/errors/endpoint-shadow').split('\n');
		expect(lines[0]).toMatch('nope');

		if (process.env.DEV) {
			expect(lines[1]).toMatch('endpoint-shadow.js:3:8');
		}

		expect(res && res.status()).toBe(500);
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "nope"'
		);

		const contents = await page.textContent('#stack');
		const location = 'endpoint-shadow.js:3:8';

		if (process.env.DEV) {
			expect(contents).toMatch(location);
		} else {
			expect(contents).not.toMatch(location);
		}
	});

	test('not ok response from shadow endpoint', async ({ page, read_errors }) => {
		const res = await page.goto('/errors/endpoint-shadow-not-ok');

		expect(read_errors('/errors/endpoint-shadow-not-ok')).toBeUndefined();

		expect(res && res.status()).toBe(555);
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Failed to load data"'
		);
	});

	test('server-side 4xx status without error from load()', async ({ page }) => {
		const response = await page.goto('/errors/load-status-without-error-server');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe('This is your custom error page saying: ""');
		expect(/** @type {Response} */ (response).status()).toBe(401);
	});

	test('client-side 4xx status without error from load()', async ({ page, javaScriptEnabled }) => {
		await page.goto('/errors/load-status-without-error-client');

		if (javaScriptEnabled) {
			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe('This is your custom error page saying: ""');
			expect(await page.innerHTML('h1')).toBe('401');
		}
	});

	test('error thrown in handle results in a rendered error page', async ({ page }) => {
		await page.goto('/errors/error-in-handle');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Error in handle"'
		);
		expect(await page.innerHTML('h1')).toBe('500');
	});

	// TODO re-enable this if https://github.com/vitejs/vite/issues/7046 is implemented
	test.skip('error evaluating module', async ({ request }) => {
		const response = await request.get('/errors/init-error-endpoint');

		expect(response.status()).toBe(500);
		expect(await response.text()).toMatch('thisvariableisnotdefined is not defined');
	});
});

test.describe.parallel('ETags', () => {
	test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

	test('generates etag/304 for text body', async ({ request }) => {
		const r1 = await request.get('/etag/text');
		const etag = r1.headers()['etag'];
		expect(etag).toBeTruthy();

		const r2 = await request.get('/etag/text', {
			headers: {
				'if-none-match': etag
			}
		});

		expect(r2.status()).toBe(304);
		expect(r2.headers()['expires']).toBe('yesterday');
	});

	test('generates etag/304 for binary body', async ({ request }) => {
		const r1 = await request.get('/etag/binary');
		const etag = r1.headers()['etag'];
		expect(etag).toBeTruthy();

		const r2 = await request.get('/etag/binary', {
			headers: {
				'if-none-match': etag
			}
		});

		expect(r2.status()).toBe(304);
	});

	test('support W/ etag prefix', async ({ request }) => {
		const r1 = await request.get('/etag/text');
		const etag = r1.headers()['etag'];
		expect(etag).toBeTruthy();

		const r2 = await request.get('/etag/text', {
			headers: {
				'if-none-match': `W/${etag}`
			}
		});

		expect(r2.status()).toBe(304);
	});

	test('custom etag', async ({ request }) => {
		const r1 = await request.get('/etag/custom');
		const etag = r1.headers()['etag'];
		expect(etag).toBe('@1234@');

		const r2 = await request.get('/etag/custom', {
			headers: {
				'if-none-match': '@1234@'
			}
		});

		expect(r2.status()).toBe(304);
	});
});

test.describe.parallel('Headers', () => {
	test('disables floc by default', async ({ page }) => {
		const response = await page.goto('/headers');
		const headers = /** @type {Response} */ (response).headers();
		expect(headers['permissions-policy']).toBe('interest-cohort=()');
	});

	test('allows headers to be sent as a Headers class instead of a POJO', async ({ page }) => {
		await page.goto('/headers/class');
		expect(await page.innerHTML('p')).toBe('bar');
	});
});

test.describe.parallel('Load', () => {
	test('fetch in root index.svelte works', async ({ page }) => {
		await page.goto('/');
		expect(await page.textContent('h1')).toBe('the answer is 42');
	});

	test('loads', async ({ page }) => {
		await page.goto('/load');
		expect(await page.textContent('h1')).toBe('bar == bar?');
	});

	test('GET fetches are serialized', async ({ page, javaScriptEnabled }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await page.goto('/load/serialization');

		if (!javaScriptEnabled) {
			// by the time JS has run, hydration will have nuked these scripts
			const script_contents = await page.innerHTML('script[sveltekit\\:data-type="data"]');

			const payload =
				'{"status":200,"statusText":"","headers":{"content-type":"application/json; charset=utf-8"},"body":"{\\"answer\\":42}"}';

			expect(script_contents).toBe(payload);
		}

		expect(requests.some((r) => r.endsWith('/load/serialization.json'))).toBe(false);
	});

	test('POST fetches are serialized', async ({ page, javaScriptEnabled }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await page.goto('/load/serialization-post');

		expect(await page.textContent('h1')).toBe('a: X');
		expect(await page.textContent('h2')).toBe('b: Y');

		const payload_a =
			'{"status":200,"statusText":"","headers":{"content-type":"text/plain;charset=UTF-8"},"body":"X"}';

		const payload_b =
			'{"status":200,"statusText":"","headers":{"content-type":"text/plain;charset=UTF-8"},"body":"Y"}';

		if (!javaScriptEnabled) {
			// by the time JS has run, hydration will have nuked these scripts
			const script_contents_a = await page.innerHTML(
				'script[sveltekit\\:data-type="data"][sveltekit\\:data-url="/load/serialization-post.json"][sveltekit\\:data-body="3t25"]'
			);

			const script_contents_b = await page.innerHTML(
				'script[sveltekit\\:data-type="data"][sveltekit\\:data-url="/load/serialization-post.json"][sveltekit\\:data-body="3t24"]'
			);

			expect(script_contents_a).toBe(payload_a);
			expect(script_contents_b).toBe(payload_b);
		}

		expect(requests.some((r) => r.endsWith('/load/serialization.json'))).toBe(false);
	});

	test('json string is returned', async ({ page }) => {
		await page.goto('/load/relay');
		expect(await page.textContent('h1')).toBe('42');
	});

	test('prefers static data over endpoint', async ({ page }) => {
		await page.goto('/load/foo');
		expect(await page.textContent('h1')).toBe('static file');
	});

	test('stuff is inherited', async ({ page, javaScriptEnabled, app }) => {
		await page.goto('/load/stuff/a/b/c');
		expect(await page.textContent('h1')).toBe('message: original + new');
		expect(await page.textContent('pre')).toBe(
			JSON.stringify({
				x: 'a',
				y: 'b',
				z: 'c'
			})
		);

		if (javaScriptEnabled) {
			await app.goto('/load/stuff/d/e/f');

			expect(await page.textContent('h1')).toBe('message: original + new');
			expect(await page.textContent('pre')).toBe(
				JSON.stringify({
					x: 'd',
					y: 'e',
					z: 'f'
				})
			);
		}
	});

	test('load function is only called when necessary', async ({ app, page, javaScriptEnabled }) => {
		if (javaScriptEnabled) {
			await page.goto('/load/change-detection/one/a');
			expect(await page.textContent('h1')).toBe('layout loads: 1');
			expect(await page.textContent('h2')).toBe('x: a: 1');

			await app.goto('/load/change-detection/one/a?unused=whatever');
			expect(await page.textContent('h2')).toBe('x: a: 1');

			await app.goto('/load/change-detection/two/b');
			expect(await page.textContent('h2')).toBe('y: b: 1');

			await app.goto('/load/change-detection/one/a');
			expect(await page.textContent('h2')).toBe('x: a: 1');

			await app.goto('/load/change-detection/one/b');
			expect(await page.textContent('h2')).toBe('x: b: 2');

			await app.invalidate('/load/change-detection/data.json');
			expect(await page.textContent('h1')).toBe('layout loads: 2');
			expect(await page.textContent('h2')).toBe('x: b: 2');

			await app.invalidate('/load/change-detection/data.json');
			expect(await page.textContent('h1')).toBe('layout loads: 3');
			expect(await page.textContent('h2')).toBe('x: b: 2');

			await app.invalidate('custom:change-detection-layout');
			expect(await page.textContent('h1')).toBe('layout loads: 4');
			expect(await page.textContent('h2')).toBe('x: b: 2');
		}
	});

	test('fetch accepts a Request object', async ({ page, clicknav }) => {
		await page.goto('/load');
		await clicknav('[href="/load/fetch-request"]');
		expect(await page.textContent('h1')).toBe('the answer is 42');
	});

	test('handles large responses', async ({ page }) => {
		await page.goto('/load');

		const chunk_size = 50000;
		const chunk_count = 100;
		const total_size = chunk_size * chunk_count;

		let chunk = '';
		for (let i = 0; i < chunk_size; i += 1) {
			chunk += String(i % 10);
		}

		let times_responded = 0;

		const { port, server } = await start_server(async (req, res) => {
			if (req.url === '/large-response.json') {
				times_responded += 1;

				res.writeHead(200, {
					'Access-Control-Allow-Origin': '*'
				});

				for (let i = 0; i < chunk_count; i += 1) {
					if (!res.write(chunk)) {
						await new Promise((fulfil) => {
							res.once('drain', () => {
								fulfil(undefined);
							});
						});
					}
				}

				res.end();
			}
		});

		await page.goto(`/load/large-response?port=${port}`);
		expect(await page.textContent('h1')).toBe(`text.length is ${total_size}`);

		expect(times_responded).toBe(1);

		server.close();
	});

	test('handles external api', async ({ page }) => {
		await page.goto('/load');
		const port = await ports.find(5000);

		/** @type {string[]} */
		const requested_urls = [];

		const server = http.createServer(async (req, res) => {
			if (!req.url) throw new Error('Incomplete request');
			requested_urls.push(req.url);

			if (req.url === '/server-fetch-request-modified.json') {
				res.writeHead(200, {
					'Access-Control-Allow-Origin': '*',
					'content-type': 'application/json'
				});

				res.end(JSON.stringify({ answer: 42 }));
			} else {
				res.statusCode = 404;
				res.end('not found');
			}
		});

		await new Promise((fulfil) => {
			server.listen(port, () => fulfil(undefined));
		});

		await page.goto(`/load/server-fetch-request?port=${port}`);

		expect(requested_urls).toEqual(['/server-fetch-request-modified.json']);
		expect(await page.textContent('h1')).toBe('the answer is 42');

		server.close();
	});

	test('makes credentialed fetches to endpoints by default', async ({ page, clicknav }) => {
		await page.goto('/load');
		await clicknav('[href="/load/fetch-credentialed"]');
		expect(await page.textContent('h1')).toBe('Hello SvelteKit!');
	});

	test('includes correct page request headers', async ({
		baseURL,
		page,
		clicknav,
		javaScriptEnabled
	}) => {
		await page.goto('/load');
		await clicknav('[href="/load/fetch-headers"]');

		const json = /** @type {string} */ (await page.textContent('pre'));
		const headers = JSON.parse(json);

		expect(headers).toEqual({
			// the referer will be the previous page in the client-side
			// navigation case
			referer: `${baseURL}/load`,
			// these headers aren't particularly useful, but they allow us to verify
			// that page headers are being forwarded
			'sec-fetch-dest': javaScriptEnabled ? 'empty' : 'document',
			'sec-fetch-mode': javaScriptEnabled ? 'cors' : 'navigate'
		});
	});

	test('exposes rawBody to endpoints', async ({ page, clicknav }) => {
		await page.goto('/load');
		await clicknav('[href="/load/raw-body"]');

		expect(await page.innerHTML('.parsed')).toBe('{"oddly":{"formatted":"json"}}');
		expect(await page.innerHTML('.raw')).toBe('{ "oddly" : { "formatted" : "json" } }');
	});

	test('does not leak props to other pages', async ({ page, clicknav }) => {
		await page.goto('/load/props/about');
		expect(await page.textContent('p')).toBe('Data: undefined');
		await clicknav('[href="/load/props/"]');
		expect(await page.textContent('p')).toBe('Data: Hello from Index!');
		await clicknav('[href="/load/props/about"]');
		expect(await page.textContent('p')).toBe('Data: undefined');
	});

	test('server-side fetch respects set-cookie header', async ({ page, context }) => {
		await context.clearCookies();

		await page.goto('/load/set-cookie-fetch');
		expect(await page.textContent('h1')).toBe('the answer is 42');

		const cookies = {};
		for (const cookie of await context.cookies()) {
			cookies[cookie.name] = cookie.value;
		}

		expect(cookies.answer).toBe('42');
		expect(cookies.doubled).toBe('84');
	});
});

test.describe.parallel('Method overrides', () => {
	test('http method is overridden via URL parameter', async ({ page }) => {
		await page.goto('/method-override');

		let val;

		// Check initial value
		val = await page.textContent('h1');
		expect('').toBe(val);

		await page.click('"PATCH"');
		val = await page.textContent('h1');
		expect('PATCH').toBe(val);

		await page.click('"DELETE"');
		val = await page.textContent('h1');
		expect('DELETE').toBe(val);
	});

	test('GET method is not overridden', async ({ page }) => {
		await page.goto('/method-override');
		await page.click('"No Override From GET"');

		const val = await page.textContent('h1');
		expect('GET').toBe(val);
	});

	test('400 response when trying to override POST with GET', async ({ page }) => {
		await page.goto('/method-override');
		await page.click('"No Override To GET"');

		expect(await page.innerHTML('pre')).toBe(
			'_method=GET is not allowed. See https://kit.svelte.dev/docs/configuration#methodoverride'
		);
	});

	test('400 response when override method not in allowed methods', async ({ page }) => {
		await page.goto('/method-override');
		await page.click('"No Override To CONNECT"');

		expect(await page.innerHTML('pre')).toBe(
			'_method=CONNECT is not allowed. See https://kit.svelte.dev/docs/configuration#methodoverride'
		);
	});
});

test.describe.parallel('Nested layouts', () => {
	test('renders a nested layout', async ({ page }) => {
		await page.goto('/nested-layout');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('p')).toBe('This is a nested layout component');
		expect(await page.textContent('h1')).toBe('Hello from inside the nested layout component');
	});

	test('renders errors in the right layout', async ({ page }) => {
		await page.goto('/nested-layout/error');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.evaluate(() => document.querySelector('p#nested'))).toBe(null);
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Error"'
		);
		expect(await page.textContent('h1')).toBe('500');
	});

	test('renders errors in the right layout after client navigation', async ({ page, clicknav }) => {
		await page.goto('/nested-layout/');
		await clicknav('[href="/nested-layout/error"]');
		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.evaluate(() => document.querySelector('p#nested'))).toBe(null);
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Error"'
		);
		expect(await page.textContent('h1')).toBe('500');
	});

	test('renders deeply-nested errors in the right layout', async ({ page }) => {
		await page.goto('/nested-layout/foo/bar/nope');
		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.evaluate(() => document.querySelector('p#nested'))).toBeTruthy();
		expect(await page.evaluate(() => document.querySelector('p#nested-foo'))).toBeTruthy();
		expect(await page.evaluate(() => document.querySelector('p#nested-bar'))).toBeTruthy();
		expect(await page.textContent('#nested-error-message')).toBe('error.message: nope');
	});

	test('resets layout', async ({ page }) => {
		await page.goto('/nested-layout/reset');

		expect(await page.evaluate(() => document.querySelector('footer'))).toBe(null);
		expect(await page.evaluate(() => document.querySelector('p'))).toBe(null);
		expect(await page.textContent('h1')).toBe('Layout reset');
		expect(await page.textContent('h2')).toBe('Hello');
	});

	test('renders the closest error page', async ({ page, clicknav }) => {
		await page.goto('/errors/nested-error-page');

		await clicknav('[href="/errors/nested-error-page/nope"]');

		expect(await page.textContent('h1')).toBe('Nested error page');
		expect(await page.textContent('#nested-error-status')).toBe('status: 500');
		expect(await page.textContent('#nested-error-message')).toBe('error.message: nope');
	});
});

test.describe.parallel('Page options', () => {
	test('does not hydrate page with hydrate=false', async ({ page, javaScriptEnabled }) => {
		await page.goto('/no-hydrate');

		await page.click('button');
		expect(await page.textContent('button')).toBe('clicks: 0');

		if (javaScriptEnabled) {
			await Promise.all([page.waitForNavigation(), page.click('[href="/no-hydrate/other"]')]);
			await Promise.all([page.waitForNavigation(), page.click('[href="/no-hydrate"]')]);

			await page.click('button');
			expect(await page.textContent('button')).toBe('clicks: 1');
		} else {
			// ensure data wasn't inlined
			expect(
				await page.evaluate(
					() => document.querySelectorAll('script[sveltekit\\:data-type="data"]').length
				)
			).toBe(0);
		}
	});

	test('does not include modulepreload links if JS is completely disabled', async ({
		page,
		javaScriptEnabled
	}) => {
		if (!javaScriptEnabled) {
			await page.goto('/no-hydrate/no-js');
			expect(await page.textContent('h1')).toBe('look ma no javascript');
			expect(
				await page.evaluate(() => document.querySelectorAll('link[rel="modulepreload"]').length)
			).toBe(0);
		}
	});

	test('disables router if router=false', async ({ page, clicknav, javaScriptEnabled }) => {
		await page.goto('/no-router/a');

		if (javaScriptEnabled) {
			await page.click('button');
			expect(await page.textContent('button')).toBe('clicks: 1');

			await Promise.all([page.waitForNavigation(), page.click('[href="/no-router/b"]')]);
			expect(await page.textContent('button')).toBe('clicks: 0');

			await page.click('button');
			expect(await page.textContent('button')).toBe('clicks: 1');

			await clicknav('[href="/no-router/a"]');
			expect(await page.textContent('button')).toBe('clicks: 1');

			await Promise.all([page.waitForNavigation(), page.click('[href="/no-router/b"]')]);
			expect(await page.textContent('button')).toBe('clicks: 0');
		}
	});

	test('transformPage can change the html output', async ({ page }) => {
		await page.goto('/transform-page');
		expect(await page.getAttribute('meta[name="transform-page"]', 'content')).toBe('Worked!');
	});

	test('does not SSR page with ssr=false', async ({ page, javaScriptEnabled }) => {
		await page.goto('/no-ssr');

		if (javaScriptEnabled) {
			expect(await page.textContent('h1')).toBe('content was rendered');
		} else {
			expect(await page.evaluate(() => document.querySelector('h1'))).toBe(null);
			expect(await page.evaluate(() => document.querySelector('style[data-svelte]'))).toBe(null);
		}
	});

	test('applies generated component styles with ssr=false (hides announcer)', async ({
		page,
		clicknav,
		javaScriptEnabled
	}) => {
		if (javaScriptEnabled) {
			await page.goto('/no-ssr');

			await clicknav('[href="/no-ssr/other"]');

			expect(
				await page.evaluate(() => {
					const el = document.querySelector('#svelte-announcer');
					return el && getComputedStyle(el).position;
				})
			).toBe('absolute');
		}
	});

	test('does not SSR error page for 404s with ssr=false', async ({ request }) => {
		const html = await request.get('/no-ssr/missing');
		expect(await html.text()).not.toContain('load function was called erroneously');
	});
});

test.describe.parallel('$app/paths', () => {
	test('includes paths', async ({ page }) => {
		await page.goto('/paths');

		expect(await page.innerHTML('pre')).toBe(
			JSON.stringify({
				base: '',
				assets: ''
			})
		);
	});

	test('replaces %svelte.assets% in template with relative path', async ({ page }) => {
		await page.goto('/');
		expect(await page.getAttribute('link[rel=icon]', 'href')).toBe('./favicon.png');

		await page.goto('/routing');
		expect(await page.getAttribute('link[rel=icon]', 'href')).toBe('./favicon.png');

		await page.goto('/routing/rest/foo/bar/baz');
		expect(await page.getAttribute('link[rel=icon]', 'href')).toBe('../../../../favicon.png');
	});
});

test.describe.parallel('$app/stores', () => {
	test('can access page.url', async ({ baseURL, page }) => {
		await page.goto('/origin');
		expect(await page.textContent('h1')).toBe(baseURL);
	});

	test('page store functions as expected', async ({ page, clicknav, javaScriptEnabled }) => {
		await page.goto('/store');

		expect(await page.textContent('h1')).toBe('Test');
		expect(await page.textContent('h2')).toBe(javaScriptEnabled ? 'Calls: 2' : 'Calls: 1');

		await clicknav('a[href="/store/result"]');
		expect(await page.textContent('h1')).toBe('Result');
		expect(await page.textContent('h2')).toBe(javaScriptEnabled ? 'Calls: 2' : 'Calls: 0');

		const oops = await page.evaluate(() => window.oops);
		expect(oops).toBeUndefined();
	});

	test('page store contains stuff', async ({ page, clicknav }) => {
		await page.goto('/store/stuff/www');

		expect(await page.textContent('#store-stuff')).toBe(
			JSON.stringify({ name: 'SvelteKit', value: 456, page: 'www' })
		);

		await clicknav('a[href="/store/stuff/zzz"]');
		expect(await page.textContent('#store-stuff')).toBe(
			JSON.stringify({ name: 'SvelteKit', value: 456, page: 'zzz' })
		);

		await clicknav('a[href="/store/stuff/xxx"]');
		expect(await page.textContent('#store-stuff')).toBe(
			JSON.stringify({ name: 'SvelteKit', value: 789, error: 'Params = xxx' })
		);

		await clicknav('a[href="/store/stuff/yyy"]');
		expect(await page.textContent('#store-stuff')).toBe(
			JSON.stringify({ name: 'SvelteKit', value: 789, error: 'Params = yyy' })
		);
	});

	test('should load stuff after reloading by goto', async ({
		page,
		clicknav,
		javaScriptEnabled
	}) => {
		const stuff1 = JSON.stringify({ name: 'SvelteKit', value: 789, error: 'uh oh' });
		const stuff2 = JSON.stringify({ name: 'SvelteKit', value: 123, foo: true });
		await page.goto('/store/stuff/www');

		await clicknav('a[href="/store/stuff/foo"]');
		expect(await page.textContent('#store-stuff')).toBe(stuff1);

		await clicknav('#reload-button');
		expect(await page.textContent('#store-stuff')).toBe(javaScriptEnabled ? stuff2 : stuff1);

		await clicknav('a[href="/store/stuff/zzz"]');
		await clicknav('a[href="/store/stuff/foo"]');
		expect(await page.textContent('#store-stuff')).toBe(stuff2);
	});

	test('navigating store contains from and to', async ({ app, page, javaScriptEnabled }) => {
		await page.goto('/store/navigating/a');

		expect(await page.textContent('#nav-status')).toBe('not currently navigating');

		if (javaScriptEnabled) {
			await app.prefetchRoutes(['/store/navigating/b']);

			const res = await Promise.all([
				page.click('a[href="/store/navigating/b"]'),
				page.textContent('#navigating')
			]);

			expect(res[1]).toBe('navigating from /store/navigating/a to /store/navigating/b');

			await page.waitForSelector('#not-navigating');
			expect(await page.textContent('#nav-status')).toBe('not currently navigating');
		}
	});
});

test.describe.parallel('searchParams', () => {
	const tests = [
		{
			description: 'exposes query string parameters',
			search: '?foo=1',
			expected: { foo: ['1'] }
		},
		{
			description: 'value-less query parameter',
			search: '?foo',
			expected: { foo: [''] }
		},
		{
			description: 'duplicated query parameter',
			search: '?key=one&key=two',
			expected: { key: ['one', 'two'] }
		},
		{
			description: 'encoded query parameter',
			search: '?key=%26a=b',
			expected: { key: ['&a=b'] }
		}
	];

	tests.forEach(({ description, search, expected }) => {
		test(description, async ({ page }) => {
			await page.goto(`/query/echo${search}`);

			const json = JSON.stringify(expected);

			expect(await page.textContent('#one')).toBe(json);
			expect(await page.textContent('#two')).toBe(json);
		});
	});

	test('updates page on client-side nav', async ({ page, clicknav }) => {
		await page.goto('/query/echo?foo=1');

		await clicknav('[href="/query/echo?bar=2"]');

		const json = JSON.stringify({ bar: ['2'] });

		expect(await page.textContent('#one')).toBe(json);
		expect(await page.textContent('#two')).toBe(json);
	});
});

test.describe.parallel('Redirects', () => {
	test('redirect', async ({ baseURL, page, clicknav, back }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/a"]');

		await page.waitForURL('/redirect/c');
		expect(await page.textContent('h1')).toBe('c');
		expect(page.url()).toBe(`${baseURL}/redirect/c`);

		await back();
		expect(page.url()).toBe(`${baseURL}/redirect`);
	});

	test('prevents redirect loops', async ({ baseURL, page, javaScriptEnabled }) => {
		await page.goto('/redirect');

		await page.click('[href="/redirect/loopy/a"]');

		if (javaScriptEnabled) {
			await page.waitForSelector('#message');
			expect(page.url()).toBe(`${baseURL}/redirect/loopy/a`);
			expect(await page.textContent('h1')).toBe('500');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "Redirect loop"'
			);
		} else {
			// there's not a lot we can do to handle server-side redirect loops
			expect(page.url()).toBe('chrome-error://chromewebdata/');
		}
	});

	test('errors on missing status', async ({ baseURL, page, clicknav }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/missing-status/a"]');

		expect(page.url()).toBe(`${baseURL}/redirect/missing-status/a`);
		expect(await page.textContent('h1')).toBe('500');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: ""redirect" property returned from load() must be accompanied by a 3xx status code"'
		);
	});

	test('errors on invalid status', async ({ baseURL, page, clicknav }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/missing-status/b"]');

		expect(page.url()).toBe(`${baseURL}/redirect/missing-status/b`);
		expect(await page.textContent('h1')).toBe('500');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: ""redirect" property returned from load() must be accompanied by a 3xx status code"'
		);
	});

	test('redirect-on-load', async ({ baseURL, page, javaScriptEnabled }) => {
		const redirected_to_url = javaScriptEnabled
			? `${baseURL}/redirect-on-load/redirected`
			: `${baseURL}/redirect-on-load`;

		await Promise.all([page.waitForResponse(redirected_to_url), page.goto('/redirect-on-load')]);

		expect(page.url()).toBe(redirected_to_url);

		if (javaScriptEnabled) {
			expect(await page.textContent('h1')).toBe('Hazaa!');
		}
	});
});

test.describe.parallel('Routing', () => {
	test('redirects from /routing/ to /routing', async ({
		baseURL,
		page,
		clicknav,
		app,
		javaScriptEnabled
	}) => {
		await page.goto('/routing/slashes');

		await clicknav('a[href="/routing/"]');
		expect(page.url()).toBe(`${baseURL}/routing`);
		expect(await page.textContent('h1')).toBe('Great success!');

		if (javaScriptEnabled) {
			await page.goto(`${baseURL}/routing/slashes`);
			await app.goto('/routing/');
			expect(page.url()).toBe(`${baseURL}/routing`);
			expect(await page.textContent('h1')).toBe('Great success!');
		}
	});

	test('redirects from /routing/? to /routing', async ({
		baseURL,
		page,
		clicknav,
		app,
		javaScriptEnabled
	}) => {
		await page.goto('/routing/slashes');

		await clicknav('a[href="/routing/?"]');
		expect(page.url()).toBe(`${baseURL}/routing`);
		expect(await page.textContent('h1')).toBe('Great success!');

		if (javaScriptEnabled) {
			await page.goto(`${baseURL}/routing/slashes`);
			await app.goto('/routing/?');
			expect(page.url()).toBe(`${baseURL}/routing`);
			expect(await page.textContent('h1')).toBe('Great success!');
		}
	});

	test('redirects from /routing/?foo=bar to /routing?foo=bar', async ({
		baseURL,
		page,
		clicknav,
		app,
		javaScriptEnabled
	}) => {
		await page.goto('/routing/slashes');

		await clicknav('a[href="/routing/?foo=bar"]');
		expect(page.url()).toBe(`${baseURL}/routing?foo=bar`);
		expect(await page.textContent('h1')).toBe('Great success!');

		if (javaScriptEnabled) {
			await page.goto(`${baseURL}/routing/slashes`);
			await app.goto('/routing/?foo=bar');
			expect(page.url()).toBe(`${baseURL}/routing?foo=bar`);
			expect(await page.textContent('h1')).toBe('Great success!');
		}
	});

	test('serves static route', async ({ page }) => {
		await page.goto('/routing/a');
		expect(await page.textContent('h1')).toBe('a');
	});

	test('serves static route from dir/index.html file', async ({ page }) => {
		await page.goto('/routing/b');
		expect(await page.textContent('h1')).toBe('b');
	});

	test('serves static route under client directory', async ({ baseURL, page }) => {
		await page.goto('/routing/client/foo');

		expect(await page.textContent('h1')).toBe('foo');

		await page.goto(`${baseURL}/routing/client/bar`);
		expect(await page.textContent('h1')).toBe('bar');

		await page.goto(`${baseURL}/routing/client/bar/b`);
		expect(await page.textContent('h1')).toBe('b');
	});

	test('serves dynamic route', async ({ page }) => {
		await page.goto('/routing/test-slug');
		expect(await page.textContent('h1')).toBe('test-slug');
	});

	test('navigates to a new page without reloading', async ({
		app,
		page,
		clicknav,
		javaScriptEnabled
	}) => {
		if (javaScriptEnabled) {
			await page.goto('/routing');

			await app.prefetchRoutes(['/routing/a']).catch((e) => {
				// from error handler tests; ignore
				if (!e.message.includes('Crashing now')) throw e;
			});

			/** @type {string[]} */
			const requests = [];
			page.on('request', (r) => requests.push(r.url()));

			await clicknav('a[href="/routing/a"]');
			expect(await page.textContent('h1')).toBe('a');

			expect(requests).toEqual([]);
		}
	});

	test('navigates programmatically', async ({ page, app, javaScriptEnabled }) => {
		if (javaScriptEnabled) {
			await page.goto('/routing/a');
			await app.goto('/routing/b');
			expect(await page.textContent('h1')).toBe('b');
		}
	});

	test('prefetches programmatically', async ({ baseURL, page, app, javaScriptEnabled }) => {
		if (javaScriptEnabled) {
			await page.goto('/routing/a');

			/** @type {string[]} */
			let requests = [];
			page.on('request', (r) => requests.push(r.url()));

			// also wait for network processing to complete, see
			// https://playwright.dev/docs/network#network-events
			await Promise.all([
				page.waitForResponse(`${baseURL}/routing/prefetched.json`),
				app.prefetch('/routing/prefetched')
			]);

			// svelte request made is environment dependent
			if (process.env.DEV) {
				expect(requests.filter((req) => req.endsWith('index.svelte')).length).toBe(1);
			} else {
				expect(requests.filter((req) => req.endsWith('.js')).length).toBe(1);
			}

			expect(requests.includes(`${baseURL}/routing/prefetched.json`)).toBe(true);

			requests = [];
			await app.goto('/routing/prefetched');
			expect(requests).toEqual([]);

			try {
				await app.prefetch('https://example.com');
				throw new Error('Error was not thrown');
			} catch (/** @type {any} */ e) {
				expect(e.message).toMatch('Attempted to prefetch a URL that does not belong to this app');
			}
		}
	});

	test('does not attempt client-side navigation to server routes', async ({ page }) => {
		await page.goto('/routing');
		await page.click('[href="/routing/ambiguous/ok.json"]');
		expect(await page.textContent('body')).toBe('ok');
	});

	test('does not attempt client-side navigation to links with sveltekit:reload', async ({
		baseURL,
		page
	}) => {
		await page.goto('/routing');

		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await Promise.all([page.waitForNavigation(), page.click('[href="/routing/b"]')]);
		expect(await page.textContent('h1')).toBe('b');
		expect(requests).toContain(`${baseURL}/routing/b`);
	});

	test('allows reserved words as route names', async ({ page }) => {
		await page.goto('/routing/const');
		expect(await page.textContent('h1')).toBe('reserved words are okay as routes');
	});

	test('resets the active element after navigation', async ({ page, clicknav }) => {
		await page.goto('/routing');
		await clicknav('[href="/routing/a"]');
		await page.waitForFunction(() => (document.activeElement || {}).nodeName == 'BODY');
	});

	test('navigates between routes with empty parts', async ({ page, clicknav }) => {
		await page.goto('/routing/dirs/foo');
		expect(await page.textContent('h1')).toBe('foo');
		await clicknav('[href="bar"]');
		expect(await page.textContent('h1')).toBe('bar');
	});

	test('navigates between dynamic routes with same segments', async ({ page, clicknav }) => {
		await page.goto('/routing/dirs/bar/xyz');
		expect(await page.textContent('h1')).toBe('A page');

		await clicknav('[href="/routing/dirs/foo/xyz"]');
		expect(await page.textContent('h1')).toBe('B page');
	});

	test('invalidates page when a segment is skipped', async ({ page, clicknav }) => {
		await page.goto('/routing/skipped/x/1');
		expect(await page.textContent('h1')).toBe('x/1');

		await clicknav('#goto-y1');
		expect(await page.textContent('h1')).toBe('y/1');
	});

	test('back button returns to initial route', async ({ page, clicknav, back }) => {
		await page.goto('/routing');
		await clicknav('[href="/routing/a"]');

		await back();
		expect(await page.textContent('h1')).toBe('Great success!');
	});

	test('back button returns to previous route when previous route has been navigated to via hash anchor', async ({
		page,
		back,
		clicknav
	}) => {
		await page.goto('/routing/hashes/a');

		await page.click('[href="#hash-target"]');
		await clicknav('[href="/routing/hashes/b"]');

		await back();
		expect(await page.textContent('h1')).toBe('a');
	});

	test('focus works if page load has hash', async ({ page }) => {
		await page.goto('/routing/hashes/target#p2');

		await page.keyboard.press('Tab');
		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toBe(
			'next focus element'
		);
	});

	test('focus works when navigating to a hash on the same page', async ({ page }) => {
		await page.goto('/routing/hashes/target');

		await page.click('[href="#p2"]');
		await page.keyboard.press('Tab');

		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toBe(
			'next focus element'
		);
	});

	test(':target pseudo-selector works when navigating to a hash on the same page', async ({
		page
	}) => {
		await page.goto('/routing/hashes/target#p1');

		expect(
			await page.evaluate(() => {
				const el = document.getElementById('p1');
				return el && getComputedStyle(el).color;
			})
		).toBe('rgb(255, 0, 0)');
		await page.click('[href="#p2"]');
		expect(
			await page.evaluate(() => {
				const el = document.getElementById('p2');
				return el && getComputedStyle(el).color;
			})
		).toBe('rgb(255, 0, 0)');
	});

	test('$page.url.hash is correctly set on page load', async ({ page, javaScriptEnabled }) => {
		if (javaScriptEnabled) {
			await page.goto('/routing/hashes/pagestore#target');
			expect(await page.textContent('#window-hash')).toBe('#target');
			expect(await page.textContent('#page-url-hash')).toBe('#target');
		}
	});

	test('$page.url.hash is correctly set on navigation', async ({ page, javaScriptEnabled }) => {
		if (javaScriptEnabled) {
			await page.goto('/routing/hashes/pagestore');
			expect(await page.textContent('#window-hash')).toBe('');
			expect(await page.textContent('#page-url-hash')).toBe('');
			await page.click('[href="#target"]');
			expect(await page.textContent('#window-hash')).toBe('#target');
			expect(await page.textContent('#page-url-hash')).toBe('#target');
		}
	});

	test('last parameter in a segment wins in cases of ambiguity', async ({ page, clicknav }) => {
		await page.goto('/routing/split-params');
		await clicknav('[href="/routing/split-params/x-y-z"]');
		expect(await page.textContent('h1')).toBe('x');
		expect(await page.textContent('h2')).toBe('y-z');
	});

	test('ignores navigation to URLs the app does not own', async ({ page }) => {
		const { port, server } = await start_server((req, res) => res.end('ok'));

		await page.goto(`/routing?port=${port}`);
		await Promise.all([
			page.click(`[href="http://localhost:${port}"]`),
			page.waitForURL(`http://localhost:${port}/`)
		]);

		server.close();
	});

	test('watch new route in dev', async ({ page, javaScriptEnabled }) => {
		await page.goto('/routing');

		if (!process.env.DEV || javaScriptEnabled) {
			return;
		}

		// hash the filename so that it won't conflict with
		// future test file that has the same name
		const route = 'bar' + new Date().valueOf();
		const content = 'Hello new route';
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const filePath = path.join(__dirname, `../src/routes/routing/${route}.svelte`);

		try {
			fs.writeFileSync(filePath, `<h1>${content}</h1>`);
			await page.waitForTimeout(250); // this is the rare time we actually need waitForTimeout; we have no visibility into whether the module graph has been invalidated
			await page.goto(`/routing/${route}`);

			expect(await page.textContent('h1')).toBe(content);
		} finally {
			fs.unlinkSync(filePath);
		}
	});

	test('navigates to ...rest', async ({ page, clicknav }) => {
		await page.goto('/routing/rest/abc/xyz');

		expect(await page.textContent('h1')).toBe('abc/xyz');

		await clicknav('[href="/routing/rest/xyz/abc/def/ghi"]');
		expect(await page.textContent('h1')).toBe('xyz/abc/def/ghi');
		expect(await page.textContent('h2')).toBe('xyz/abc/def/ghi');

		await clicknav('[href="/routing/rest/xyz/abc/def"]');
		expect(await page.textContent('h1')).toBe('xyz/abc/def');
		expect(await page.textContent('h2')).toBe('xyz/abc/def');

		await clicknav('[href="/routing/rest/xyz/abc"]');
		expect(await page.textContent('h1')).toBe('xyz/abc');
		expect(await page.textContent('h2')).toBe('xyz/abc');

		await clicknav('[href="/routing/rest"]');
		expect(await page.textContent('h1')).toBe('');
		expect(await page.textContent('h2')).toBe('');

		await clicknav('[href="/routing/rest/xyz/abc/deep"]');
		expect(await page.textContent('h1')).toBe('xyz/abc');
		expect(await page.textContent('h2')).toBe('xyz/abc');

		await page.click('[href="/routing/rest/xyz/abc/qwe/deep.json"]');
		expect(await page.textContent('body')).toBe('xyz/abc/qwe');
	});

	test('rest parameters do not swallow characters', async ({ page, clicknav, back }) => {
		await page.goto('/routing/rest/non-greedy');

		await clicknav('[href="/routing/rest/non-greedy/foo/one/two"]');
		expect(await page.textContent('h1')).toBe('non-greedy');
		expect(await page.textContent('h2')).toBe('{"rest":"one/two"}');

		await clicknav('[href="/routing/rest/non-greedy/food/one/two"]');
		expect(await page.textContent('h1')).not.toBe('non-greedy');

		await back();

		await clicknav('[href="/routing/rest/non-greedy/one-bar/two/three"]');
		expect(await page.textContent('h1')).toBe('non-greedy');
		expect(await page.textContent('h2')).toBe('{"dynamic":"one","rest":"two/three"}');

		await clicknav('[href="/routing/rest/non-greedy/one-bard/two/three"]');
		expect(await page.textContent('h1')).not.toBe('non-greedy');
	});

	test('reloads when navigating between ...rest pages', async ({ page, clicknav }) => {
		await page.goto('/routing/rest/path/one');
		expect(await page.textContent('h1')).toBe('path: /routing/rest/path/one');

		await clicknav('[href="/routing/rest/path/two"]');
		expect(await page.textContent('h1')).toBe('path: /routing/rest/path/two');

		await clicknav('[href="/routing/rest/path/three"]');
		expect(await page.textContent('h1')).toBe('path: /routing/rest/path/three');
	});

	test('allows rest routes to have prefixes and suffixes', async ({ page }) => {
		await page.goto('/routing/rest/complex/prefix-one/two/three');
		expect(await page.textContent('h1')).toBe('parts: one/two/three');
	});

	test('links to unmatched routes result in a full page navigation, not a 404', async ({
		page,
		clicknav
	}) => {
		await page.goto('/routing');
		await clicknav('[href="/static.json"]');
		expect(await page.textContent('body')).toBe('"static file"\n');
	});

	test('navigation is cancelled upon subsequent navigation', async ({
		baseURL,
		page,
		clicknav
	}) => {
		await page.goto('/routing/cancellation');
		await page.click('[href="/routing/cancellation/a"]');
		await clicknav('[href="/routing/cancellation/b"]');

		expect(await page.url()).toBe(`${baseURL}/routing/cancellation/b`);

		await page.evaluate('window.fulfil_navigation && window.fulfil_navigation()');
		expect(await page.url()).toBe(`${baseURL}/routing/cancellation/b`);
	});

	test('Relative paths are relative to the current URL', async ({ page, clicknav }) => {
		await page.goto('/iframes');
		await clicknav('[href="/iframes/nested/parent"]');

		expect(await page.frameLocator('iframe').locator('h1').textContent()).toBe(
			'Hello from the child'
		);
	});

	test('event.params are available in handle', async ({ request }) => {
		const response = await request.get('/routing/params-in-handle/banana');
		expect(await response.json()).toStrictEqual({
			key: 'routing/params-in-handle/[x]',
			params: { x: 'banana' }
		});
	});

	test('exposes page.routeId', async ({ page, clicknav }) => {
		await page.goto('/routing/route-id');
		await clicknav('[href="/routing/route-id/foo"]');

		expect(await page.textContent('h1')).toBe('routeId in load: routing/route-id/[x]');
		expect(await page.textContent('h2')).toBe('routeId in store: routing/route-id/[x]');
	});
});

test.describe.parallel('Session', () => {
	test('session is available', async ({ page, javaScriptEnabled }) => {
		await page.goto('/session');

		expect(await page.innerHTML('h1')).toBe('answer via props: 42');
		expect(await page.innerHTML('h2')).toBe('answer via store: 42');

		if (javaScriptEnabled) {
			await page.click('button');
			expect(await page.innerHTML('h3')).toBe('answer via props is 43');
			expect(await page.innerHTML('h4')).toBe('answer via store is 43');
		}
	});
});

test.describe.parallel('Shadow DOM', () => {
	test('client router captures anchors in shadow dom', async ({
		app,
		page,
		clicknav,
		javaScriptEnabled
	}) => {
		await page.goto('/routing/shadow-dom');

		if (javaScriptEnabled) {
			await app.prefetchRoutes(['/routing/a']).catch((e) => {
				// from error handler tests; ignore
				if (!e.message.includes('Crashing now')) throw e;
			});

			/** @type {string[]} */
			const requests = [];
			page.on('request', (r) => requests.push(r.url()));

			await clicknav('div[id="clickme"]');
			expect(await page.textContent('h1')).toBe('a');

			expect(requests).toEqual([]);
		}
	});
});

test.describe.parallel('Static files', () => {
	test('static files', async ({ request }) => {
		let response = await request.get('/static.json');
		expect(await response.json()).toBe('static file');

		response = await request.get('/subdirectory/static.json');
		expect(await response.json()).toBe('subdirectory file');

		response = await request.get('/favicon.ico');
		expect(response.status()).toBe(200);
	});

	test('does not use Vite to serve contents of static directory', async ({ request }) => {
		const response = await request.get('/static/static.json');
		expect(response.status()).toBe(process.env.DEV ? 403 : 404);
	});
});

test.describe.parallel('Matchers', () => {
	test('Matches parameters', async ({ page, clicknav }) => {
		await page.goto('/routing/matched');

		await clicknav('[href="/routing/matched/a"]');
		expect(await page.textContent('h1')).toBe('lowercase: a');

		await clicknav('[href="/routing/matched/B"]');
		expect(await page.textContent('h1')).toBe('uppercase: B');

		await clicknav('[href="/routing/matched/1"]');
		expect(await page.textContent('h1')).toBe('number: 1');

		await clicknav('[href="/routing/matched/everything-else"]');
		expect(await page.textContent('h1')).toBe('fallback: everything-else');
	});
});

test.describe.parallel('XSS', () => {
	test('replaces %svelte.xxx% tags safely', async ({ page }) => {
		await page.goto('/unsafe-replacement');

		const content = await page.textContent('body');
		expect(content).toMatch('$& $&');
	});

	test('escapes inline data', async ({ page, javaScriptEnabled }) => {
		await page.goto('/xss');

		expect(await page.textContent('h1')).toBe(
			'user.name is </script><script>window.pwned = 1</script>'
		);

		if (!javaScriptEnabled) {
			// @ts-expect-error - check global injected variable
			expect(await page.evaluate(() => window.pwned)).toBeUndefined();
		}
	});

	const uri_xss_payload = encodeURIComponent('</script><script>window.pwned=1</script>');
	test('no xss via dynamic route path', async ({ page }) => {
		await page.goto(`/xss/${uri_xss_payload}`);

		// @ts-expect-error - check global injected variable
		expect(await page.evaluate(() => window.pwned)).toBeUndefined();
	});

	test('no xss via query param', async ({ page }) => {
		await page.goto(`/xss/query?key=${uri_xss_payload}`);

		// @ts-expect-error - check global injected variable
		expect(await page.evaluate(() => window.pwned)).toBeUndefined();
	});

	test('no xss via shadow endpoint', async ({ page }) => {
		await page.goto('/xss/shadow');

		// @ts-expect-error - check global injected variable
		expect(await page.evaluate(() => window.pwned)).toBeUndefined();
		expect(await page.textContent('h1')).toBe(
			'user.name is </script><script>window.pwned = 1</script>'
		);
	});
});
