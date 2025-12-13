import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('CSS', () => {
	/**
	 * @param {(selector: string, prop: string) => Promise<string>} get_computed_style
	 */
	function check_styles(get_computed_style) {
		test.step('applies imported styles', async () => {
			expect(await get_computed_style('.styled', 'color')).toBe('rgb(255, 0, 0)');
		});

		test.step('applies imported styles in the correct order', async () => {
			expect(await get_computed_style('.overridden', 'color')).toBe('rgb(0, 128, 0)');
		});

		test.step('applies layout styles', async () => {
			expect(await get_computed_style('footer', 'color')).toBe('rgb(128, 0, 128)');
		});

		test.step('applies local styles', async () => {
			expect(await get_computed_style('.also-styled', 'color')).toBe('rgb(0, 0, 255)');
		});

		test.step('does not apply raw and url', async () => {
			expect(await get_computed_style('.not', 'color')).toBe('rgb(0, 0, 0)');
		});
	}

	test('applies styles correctly', async ({ page, get_computed_style }) => {
		await page.goto('/css');
		// without this assertion, the WebKit browser seems to close before we can compute the styles
		await expect(page.locator('.styled')).toBeVisible();
		check_styles(get_computed_style);
	});

	test('applies styles correctly after client-side navigation', async ({
		page,
		app,
		get_computed_style,
		javaScriptEnabled
	}) => {
		if (!javaScriptEnabled) return;

		await page.goto('/');
		await app.goto('/css');

		check_styles(get_computed_style);
	});

	test('loads styles on routes with encoded characters', async ({ page, get_computed_style }) => {
		await page.goto('/css/encöded');
		expect(await get_computed_style('h1', 'color')).toBe('rgb(128, 0, 128)');
	});
});

test.describe('Shadowed pages', () => {
	test('Loads props from an endpoint', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/simple"]');
		await expect(page.locator('h1')).toHaveText('The answer is 42');
	});

	test('Handles GET redirects', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/redirect-get"]');
		await expect(page.locator('h1')).toHaveText('Redirection was successful');
	});

	test('Handles GET redirects with cookies', async ({ page, context, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/redirect-get-with-cookie"]');
		await expect(page.locator('h1')).toHaveText('Redirection was successful');

		const cookies = await context.cookies();
		expect(cookies).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'shadow-redirect', value: 'happy' })])
		);
	});

	test('Handles GET redirects with cookies from fetch response', async ({
		page,
		context,
		clicknav
	}) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/redirect-get-with-cookie-from-fetch"]');
		await expect(page.locator('h1')).toHaveText('Redirection was successful');

		const cookies = await context.cookies();
		expect(cookies).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'shadow-redirect-fetch', value: 'happy' })
			])
		);
	});

	test('Handles POST redirects', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('#redirect-post');
		await expect(page.locator('h1')).toHaveText('Redirection was successful');
	});

	test('Handles POST redirects with cookies', async ({ page, context, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('#redirect-post-with-cookie');
		await expect(page.locator('h1')).toHaveText('Redirection was successful');

		const cookies = await context.cookies();
		expect(cookies).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'shadow-redirect', value: 'happy' })])
		);
	});

	test('Handles POST success with returned location', async ({ page, clicknav }) => {
		await page.goto('/shadowed/post-success-redirect');
		await clicknav('button');
		await expect(page.locator('h1')).toHaveText('POST was successful');
	});

	test('Renders error page for 4xx and 5xx responses from GET', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/error-get"]');
		await expect(page.locator('h1')).toHaveText('404');
	});

	test('Merges bodies for 4xx and 5xx responses from non-GET', async ({ page }) => {
		await page.goto('/shadowed');
		const [response] = await Promise.all([page.waitForNavigation(), page.click('#error-post')]);
		await expect(page.locator('h1')).toHaveText('hello from get / echo: posted data');

		expect(response?.status()).toBe(400);
		await expect(page.locator('h2')).toHaveText('status: 400');
	});

	test('Endpoint receives consistent URL', async ({ baseURL, page, clicknav }) => {
		await page.goto('/shadowed/same-render-entry');
		await clicknav('[href="/shadowed/same-render?param1=value1"]');
		await expect(page.locator('h1')).toHaveText(
			`URL: ${baseURL}/shadowed/same-render?param1=value1`
		);
	});

	test('Works with missing get handler', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/no-get"]');
		await expect(page.locator('h1')).toHaveText('hello');
	});

	test('Invalidates shadow data when URL changes', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/dynamic/foo"]');
		await expect(page.locator('h1')).toHaveText('slug: foo');

		await clicknav('[href="/shadowed/dynamic/bar"]');
		await expect(page.locator('h1')).toHaveText('slug: bar');

		await page.goto('/shadowed/dynamic/foo');
		await expect(page.locator('h1')).toHaveText('slug: foo');
		await clicknav('[href="/shadowed/dynamic/bar"]');
		await expect(page.locator('h1')).toHaveText('slug: bar');
	});

	test('Shadow redirect', async ({ page, clicknav }) => {
		await page.goto('/shadowed/redirect');
		await clicknav('[href="/shadowed/redirect/a"]');
		await expect(page.locator('h1')).toHaveText('done');
	});

	test('Endpoint without GET', async ({ page, clicknav, baseURL, javaScriptEnabled }) => {
		await page.goto('/shadowed');

		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await clicknav('[href="/shadowed/missing-get"]');

		await expect(page.locator('h1')).toHaveText('post without get');

		// check that the router didn't fall back to the server
		if (javaScriptEnabled) {
			expect(requests).not.toContain(`${baseURL}/shadowed/missing-get`);
		}
	});

	test('Parent data is present', async ({ page, clicknav }) => {
		await page.goto('/shadowed/parent');
		await expect(page.locator('h2')).toHaveText(
			'Layout data: {"foo":{"bar":"Custom layout"},"layout":"layout"}'
		);
		await expect(page.locator('p')).toHaveText(
			'Page data: {"foo":{"bar":"Custom layout"},"layout":"layout","page":"page","data":{"rootlayout":"rootlayout","layout":"layout"}}'
		);

		await clicknav('[href="/shadowed/parent?test"]');
		await expect(page.locator('h2')).toHaveText(
			'Layout data: {"foo":{"bar":"Custom layout"},"layout":"layout"}'
		);
		await expect(page.locator('p')).toHaveText(
			'Page data: {"foo":{"bar":"Custom layout"},"layout":"layout","page":"page","data":{"rootlayout":"rootlayout","layout":"layout"}}'
		);

		await clicknav('[href="/shadowed/parent/sub"]');
		await expect(page.locator('h2')).toHaveText(
			'Layout data: {"foo":{"bar":"Custom layout"},"layout":"layout"}'
		);
		await expect(page.locator('p')).toHaveText(
			'Page data: {"foo":{"bar":"Custom layout"},"layout":"layout","sub":"sub","data":{"rootlayout":"rootlayout","layout":"layout"}}'
		);
	});

	if (process.env.DEV) {
		test('Data must be serializable', async ({ page, clicknav }) => {
			await page.goto('/shadowed');
			await clicknav('[href="/shadowed/serialization"]');

			await expect(page.locator('h1')).toHaveText('500');
			await expect(page.locator('#message')).toHaveText(
				'This is your custom error page saying: "Data returned from `load` while rendering /shadowed/serialization is not serializable: Cannot stringify arbitrary non-POJOs (data.nope).' +
					' If you need to serialize/deserialize custom types, use transport hooks: https://svelte.dev/docs/kit/hooks#Universal-hooks-transport. (500 Internal Error)"'
			);
		});
	}
});

test.describe('Errors', () => {
	if (process.env.DEV) {
		// TODO these probably shouldn't have the full render treatment,
		// given that they will never be user-visible in prod
		test('server-side errors', async ({ page }) => {
			await page.goto('/errors/serverside');

			await expect(page.locator('footer')).toHaveText('Custom layout');
			await expect(page.locator('#message')).toHaveText(
				'This is your custom error page saying: "Crashing now (500 Internal Error)"'
			);
		});

		test('server-side module context errors', async ({ page }) => {
			test.fixme();

			await page.goto('/errors/module-scope-server');

			await expect(page.locator('footer')).toHaveText('Custom layout');
			await expect(page.locator('#message')).toHaveText(
				'This is your custom error page saying: "Crashing now"'
			);
		});

		test('errors on invalid load function response', async ({ page, app, javaScriptEnabled }) => {
			if (javaScriptEnabled) {
				await page.goto('/');
				await app.goto('/errors/invalid-load-response');
			} else {
				await page.goto('/errors/invalid-load-response');
			}

			await expect(page.locator('footer')).toHaveText('Custom layout');

			const details = javaScriptEnabled
				? "related to route '/errors/invalid-load-response'"
				: 'in src/routes/errors/invalid-load-response/+page.js';

			await expect(page.locator('#message')).toHaveText(
				`This is your custom error page saying: "a load function ${details} returned an array, but must return a plain object at the top level (i.e. \`return {...}\`) (500 Internal Error)"`
			);
		});

		test('errors on invalid server load function response', async ({
			page,
			app,
			javaScriptEnabled
		}) => {
			if (javaScriptEnabled) {
				await page.goto('/');
				await app.goto('/errors/invalid-server-load-response');
			} else {
				await page.goto('/errors/invalid-server-load-response');
			}

			await expect(page.locator('footer')).toHaveText('Custom layout');

			await expect(page.locator('#message')).toHaveText(
				'This is your custom error page saying: "a load function in src/routes/errors/invalid-server-load-response/+page.server.js returned an array, but must return a plain object at the top level (i.e. `return {...}`) (500 Internal Error)"'
			);
		});
	}

	test('server-side load errors', async ({ page, get_computed_style }) => {
		await page.goto('/errors/load-server');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Crashing now (500 Internal Error)"'
		);

		expect(await get_computed_style('h1', 'color')).toBe('rgb(255, 0, 0)');
	});

	test('404', async ({ page }) => {
		const response = await page.goto('/why/would/anyone/fetch/this/url');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Not found: /why/would/anyone/fetch/this/url (404 Not Found)"'
		);
		expect(/** @type {Response} */ (response).status()).toBe(404);
	});

	test('server-side error from load() is a string', async ({ page }) => {
		const response = await page.goto('/errors/load-error-string-server');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Not found"'
		);
		expect(/** @type {Response} */ (response).status()).toBe(555);
	});

	test('server-side error from load() is an Error', async ({ page }) => {
		const response = await page.goto('/errors/load-error-server');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Not found"'
		);
		expect(/** @type {Response} */ (response).status()).toBe(555);
	});

	test('server-side error from load() still has layout data', async ({ page }) => {
		await page.goto('/errors/load-error-server/layout-data');
		await expect(page.locator('#error-layout-data')).toHaveText('42');
	});

	test('error in endpoint', async ({ page, read_errors }) => {
		const res = await page.goto('/errors/endpoint');

		// should include stack trace
		const lines = read_errors('/errors/endpoint.json').stack.split('\n');
		expect(lines[0]).toMatch('nope');

		if (process.env.DEV) {
			expect(lines[1]).toMatch('endpoint.json');
		}

		expect(res && res.status()).toBe(500);
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "500 (500 Internal Error)"'
		);
	});

	test('error in shadow endpoint', async ({ page, read_errors }) => {
		const res = await page.goto('/errors/endpoint-shadow');

		// should include stack trace
		const lines = read_errors('/errors/endpoint-shadow').stack.split('\n');
		expect(lines[0]).toMatch('nope');

		if (process.env.DEV) {
			expect(lines[1]).toMatch('+page.server.js:3:8');
		}

		expect(res && res.status()).toBe(500);
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "nope (500 Internal Error)"'
		);
	});

	test('not ok response from shadow endpoint', async ({ page, read_errors }) => {
		const res = await page.goto('/errors/endpoint-shadow-not-ok');

		expect(read_errors('/errors/endpoint-shadow-not-ok')).toBeUndefined();

		expect(res && res.status()).toBe(555);
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Error: 555"'
		);
	});

	test('prerendering a page with a mutative page endpoint results in a catchable error', async ({
		page
	}) => {
		await page.goto('/prerendering/mutative-endpoint');
		await expect(page.locator('h1')).toHaveText('500');

		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Cannot prerender pages with actions (500 Internal Error)"'
		);
	});

	test('page endpoint GET thrown error message is preserved', async ({
		page,
		clicknav,
		read_errors
	}) => {
		await page.goto('/errors/page-endpoint');
		await clicknav('#get-implicit');

		await expect(page.locator('pre')).toHaveText(
			JSON.stringify({ status: 500, message: 'oops (500 Internal Error)' }, null, '  ')
		);

		const { status, name, message, stack, fancy } = read_errors(
			'/errors/page-endpoint/get-implicit'
		);
		expect(status).toBe(undefined);
		expect(name).toBe('FancyError');
		expect(message).toBe('oops');
		expect(fancy).toBe(true);
		if (process.env.DEV) {
			const lines = stack.split('\n');
			expect(lines[1]).toContain('+page.server.js:4:8');
		}
	});

	test('page endpoint GET HttpError message is preserved', async ({
		page,
		clicknav,
		read_errors
	}) => {
		await page.goto('/errors/page-endpoint');
		await clicknav('#get-explicit');

		await expect(page.locator('pre')).toHaveText(
			JSON.stringify({ status: 400, message: 'oops' }, null, '  ')
		);

		const error = read_errors('/errors/page-endpoint/get-explicit');
		expect(error).toBe(undefined);
	});

	test('page endpoint POST unexpected error message is preserved', async ({
		page,
		clicknav,
		read_errors
	}) => {
		// The case where we're submitting a POST request via a form.
		// It should show the __error template with our message.
		await page.goto('/errors/page-endpoint');
		await clicknav('#post-implicit');

		await expect(page.locator('pre')).toHaveText(
			JSON.stringify({ status: 500, message: 'oops (500 Internal Error)' }, null, '  ')
		);

		const { status, name, message, stack, fancy } = read_errors(
			'/errors/page-endpoint/post-implicit'
		);

		expect(status).toBe(undefined);
		expect(name).toBe('FancyError');
		expect(message).toBe('oops');
		expect(fancy).toBe(true);
		if (process.env.DEV) {
			const lines = stack.split('\n');
			expect(lines[1]).toContain('+page.server.js:6:9');
		}
	});

	test('page endpoint POST HttpError error message is preserved', async ({
		page,
		clicknav,
		read_errors
	}) => {
		// The case where we're submitting a POST request via a form.
		// It should show the __error template with our message.
		await page.goto('/errors/page-endpoint');
		await clicknav('#post-explicit');

		await expect(page.locator('pre')).toHaveText(
			JSON.stringify({ status: 400, message: 'oops' }, null, '  ')
		);

		const error = read_errors('/errors/page-endpoint/post-explicit');
		expect(error).toBe(undefined);
	});
});

test.describe('Headers', () => {
	test('allows headers to be sent as a Headers class instead of a POJO', async ({ page }) => {
		await page.goto('/headers/class');
		expect(await page.innerHTML('p')).toBe('bar');
	});
});

test.describe('Redirects', () => {
	test('redirect', async ({ baseURL, page, clicknav }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/a"]');

		await page.waitForURL('/redirect/c');
		await expect(page.locator('h1')).toHaveText('c');
		expect(page.url()).toBe(`${baseURL}/redirect/c`);

		await page.goBack();
		expect(page.url()).toBe(`${baseURL}/redirect`);
	});

	test('prevents redirect loops', async ({ baseURL, page, javaScriptEnabled, browserName }) => {
		await page.goto('/redirect');

		await page.locator('[href="/redirect/loopy/a"]').click();

		if (javaScriptEnabled) {
			await page.waitForSelector('#message');
			expect(page.url()).toBe(`${baseURL}/redirect/loopy/a`);
			await expect(page.locator('h1')).toHaveText('500');
			await expect(page.locator('#message')).toHaveText(
				'This is your custom error page saying: "Redirect loop (500 Internal Error)"'
			);
		} else {
			// there's not a lot we can do to handle server-side redirect loops
			if (browserName === 'chromium') {
				expect(page.url()).toBe('chrome-error://chromewebdata/');
			} else {
				expect(page.url()).toBe(`${baseURL}/redirect`);
			}
		}
	});

	test('errors on missing status', async ({
		baseURL,
		page,
		clicknav,
		javaScriptEnabled,
		read_errors
	}) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/missing-status/a"]');

		const message = process.env.DEV || !javaScriptEnabled ? 'Invalid status code' : 'Redirect loop';

		expect(page.url()).toBe(`${baseURL}/redirect/missing-status/a`);
		await expect(page.locator('h1')).toHaveText('500');
		await expect(page.locator('#message')).toHaveText(
			`This is your custom error page saying: "${message} (500 Internal Error)"`
		);

		if (!javaScriptEnabled) {
			// handleError is not invoked for client-side navigation
			const lines = read_errors('/redirect/missing-status/a').stack.split('\n');
			expect(lines[0]).toBe(`Error: ${message}`);
		}
	});

	test('errors on invalid status', async ({ baseURL, page, clicknav, javaScriptEnabled }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/missing-status/b"]');

		const message = process.env.DEV || !javaScriptEnabled ? 'Invalid status code' : 'Redirect loop';

		expect(page.url()).toBe(`${baseURL}/redirect/missing-status/b`);
		await expect(page.locator('h1')).toHaveText('500');
		await expect(page.locator('#message')).toHaveText(
			`This is your custom error page saying: "${message} (500 Internal Error)"`
		);
	});

	test('redirect-on-load', async ({ baseURL, page, javaScriptEnabled }) => {
		const redirected_to_url = javaScriptEnabled
			? `${baseURL}/redirect-on-load/redirected`
			: `${baseURL}/redirect-on-load`;

		await Promise.all([page.waitForResponse(redirected_to_url), page.goto('/redirect-on-load')]);

		expect(page.url()).toBe(redirected_to_url);

		if (javaScriptEnabled) {
			await expect(page.locator('h1')).toHaveText('Hazaa!');
		}
	});

	test('redirect response in handle hook', async ({ baseURL, clicknav, page }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/in-handle?response"]');

		await page.waitForURL('/redirect/c');
		await expect(page.locator('h1')).toHaveText('c');
		expect(page.url()).toBe(`${baseURL}/redirect/c`);

		await page.goBack();
		expect(page.url()).toBe(`${baseURL}/redirect`);
	});

	test('redirect in handle hook', async ({ baseURL, clicknav, page }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/in-handle?throw"]');

		await page.waitForURL('/redirect/c');
		await expect(page.locator('h1')).toHaveText('c');
		expect(page.url()).toBe(`${baseURL}/redirect/c`);

		await page.goBack();
		expect(page.url()).toBe(`${baseURL}/redirect`);
	});

	test('sets cookies when redirect in handle hook', async ({ page, app, javaScriptEnabled }) => {
		await page.goto('/cookies/set');
		let span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('teapot');

		if (javaScriptEnabled) {
			const [, response] = await Promise.all([
				app.goto('/redirect/in-handle?throw&cookies'),
				page.waitForResponse((request) =>
					request.url().endsWith('in-handle/__data.json?throw=&cookies=&x-sveltekit-invalidated=01')
				)
			]);
			expect((await response.allHeaders())['set-cookie']).toBeDefined();
		}

		await page.goto('/redirect/in-handle?throw&cookies');
		span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('undefined');
	});

	test('works when used from another package', async ({ page }) => {
		await page.goto('/redirect/package');
		await expect(page.locator('h1')).toHaveText('c');
	});
});

test.describe('Routing', () => {
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
		await expect(page.locator('h1')).toHaveText('Great success!');

		if (javaScriptEnabled) {
			await page.goto(`${baseURL}/routing/slashes`);
			await app.goto('/routing/');
			expect(page.url()).toBe(`${baseURL}/routing`);
			await expect(page.locator('h1')).toHaveText('Great success!');
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
		await expect(page.locator('h1')).toHaveText('Great success!');

		if (javaScriptEnabled) {
			await page.goto(`${baseURL}/routing/slashes`);
			await app.goto('/routing/?');
			expect(page.url()).toBe(`${baseURL}/routing`);
			await expect(page.locator('h1')).toHaveText('Great success!');
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
		await expect(page.locator('h1')).toHaveText('Great success!');

		if (javaScriptEnabled) {
			await page.goto(`${baseURL}/routing/slashes`);
			await app.goto('/routing/?foo=bar');
			expect(page.url()).toBe(`${baseURL}/routing?foo=bar`);
			await expect(page.locator('h1')).toHaveText('Great success!');
		}
	});

	test('serves static route', async ({ page }) => {
		await page.goto('/routing/a');
		await expect(page.locator('h1')).toHaveText('a');
	});

	test('serves static route from dir/index.html file', async ({ page }) => {
		await page.goto('/routing/b');
		await expect(page.locator('h1')).toHaveText('b');
	});

	test('serves static route under client directory', async ({ baseURL, page }) => {
		await page.goto('/routing/client/foo');

		await expect(page.locator('h1')).toHaveText('foo');

		await page.goto(`${baseURL}/routing/client/bar`);
		await expect(page.locator('h1')).toHaveText('bar');

		await page.goto(`${baseURL}/routing/client/bar/b`);
		await expect(page.locator('h1')).toHaveText('b');
	});

	test('serves dynamic route', async ({ page }) => {
		await page.goto('/routing/test-slug');
		await expect(page.locator('h1')).toHaveText('test-slug');
	});

	test('does not attempt client-side navigation to server routes', async ({ page }) => {
		await page.goto('/routing');
		await page.locator('[href="/routing/ambiguous/ok.json"]').click();
		await expect(page.locator('body')).toHaveText('ok');
	});

	test('does not attempt client-side navigation to links with data-sveltekit-reload', async ({
		baseURL,
		page,
		clicknav
	}) => {
		await page.goto('/routing');

		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await clicknav('[href="/routing/b"]');
		await expect(page.locator('h1')).toHaveText('b');
		expect(requests).toContain(`${baseURL}/routing/b`);
	});

	test('allows reserved words as route names', async ({ page }) => {
		await page.goto('/routing/const');
		await expect(page.locator('h1')).toHaveText('reserved words are okay as routes');
	});

	test('resets the active element after navigation', async ({ page, clicknav }) => {
		await page.goto('/routing');
		await clicknav('[href="/routing/a"]');
		await page.waitForFunction(() => (document.activeElement || {}).nodeName == 'BODY');
	});

	test('navigates between routes with empty parts', async ({ page, clicknav }) => {
		await page.goto('/routing/dirs/foo');
		await expect(page.locator('h1')).toHaveText('foo');
		await clicknav('[href="bar"]');
		await expect(page.locator('h1')).toHaveText('bar');
	});

	test('navigates between dynamic routes with same segments', async ({ page, clicknav }) => {
		await page.goto('/routing/dirs/bar/xyz');
		await expect(page.locator('h1')).toHaveText('A page');

		await clicknav('[href="/routing/dirs/foo/xyz"]');
		await expect(page.locator('h1')).toHaveText('B page');
	});

	test('invalidates page when a segment is skipped', async ({ page, clicknav }) => {
		await page.goto('/routing/skipped/x/1');
		await expect(page.locator('h1')).toHaveText('x/1');

		await clicknav('#goto-y1');
		await expect(page.locator('h1')).toHaveText('y/1');
	});

	test('back button returns to initial route', async ({ page, clicknav }) => {
		await page.goto('/routing');
		await clicknav('[href="/routing/a"]');

		await page.goBack();
		await expect(page.locator('h1')).toHaveText('Great success!');
	});

	test('focus works if page load has hash', async ({ page, browserName }) => {
		await page.goto('/routing/hashes/target#p2');

		await page.waitForSelector('#p2:focus');
		await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
		await page.waitForSelector('button:focus');
	});

	test('focus works when navigating to a hash on the same page', async ({ page, browserName }) => {
		await page.goto('/routing/hashes/target');

		await page.click('[href="#p2"]');
		await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');

		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toBe(
			'next focus element'
		);
	});

	test(':target pseudo-selector works when navigating to a hash on the same page', async ({
		page,
		get_computed_style
	}) => {
		await page.goto('/routing/hashes/target#p1');

		expect(await get_computed_style('#p1', 'color')).toBe('rgb(255, 0, 0)');
		await page.click('[href="#p2"]');
		expect(await get_computed_style('#p2', 'color')).toBe('rgb(255, 0, 0)');
	});

	test('last parameter in a segment wins in cases of ambiguity', async ({ page, clicknav }) => {
		await page.goto('/routing/split-params');
		await clicknav('[href="/routing/split-params/x-y-z"]');
		await expect(page.locator('h1')).toHaveText('x');
		await expect(page.locator('h2')).toHaveText('y-z');
	});

	test('ignores navigation to URLs the app does not own', async ({ page, start_server }) => {
		const { port } = await start_server((req, res) => res.end('ok'));

		await page.goto(`/routing?port=${port}`);
		await Promise.all([
			page.click(`[href="http://localhost:${port}"]`),
			// assert that the app can visit a URL not owned by the app without crashing
			page.waitForURL(`http://localhost:${port}/`)
		]);
	});

	test('navigates to ...rest', async ({ page, clicknav }) => {
		await page.goto('/routing/rest/abc/xyz');

		await expect(page.locator('h1')).toHaveText('abc/xyz');

		await clicknav('[href="/routing/rest/xyz/abc/def/ghi"]');
		await expect(page.locator('h1')).toHaveText('xyz/abc/def/ghi');
		await expect(page.locator('h2')).toHaveText('xyz/abc/def/ghi');

		await clicknav('[href="/routing/rest/xyz/abc/def"]');
		await expect(page.locator('h1')).toHaveText('xyz/abc/def');
		await expect(page.locator('h2')).toHaveText('xyz/abc/def');

		await clicknav('[href="/routing/rest/xyz/abc"]');
		await expect(page.locator('h1')).toHaveText('xyz/abc');
		await expect(page.locator('h2')).toHaveText('xyz/abc');

		await clicknav('[href="/routing/rest"]');
		await expect(page.locator('h1')).toHaveText('');
		await expect(page.locator('h2')).toHaveText('');

		await clicknav('[href="/routing/rest/xyz/abc/deep"]');
		await expect(page.locator('h1')).toHaveText('xyz/abc');
		await expect(page.locator('h2')).toHaveText('xyz/abc');

		await page.locator('[href="/routing/rest/xyz/abc/qwe/deep.json"]').click();
		await expect(page.locator('body')).toHaveText('xyz/abc/qwe');
	});

	test('rest parameters do not swallow characters', async ({ page, clicknav }) => {
		await page.goto('/routing/rest/non-greedy');

		await clicknav('[href="/routing/rest/non-greedy/foo/one/two"]');
		await expect(page.locator('h1')).toHaveText('non-greedy');
		await expect(page.locator('h2')).toHaveText('{"rest":"one/two"}');

		await clicknav('[href="/routing/rest/non-greedy/food/one/two"]');
		await expect(page.locator('h1')).not.toHaveText('non-greedy');

		await page.goBack();

		await clicknav('[href="/routing/rest/non-greedy/one-bar/two/three"]');
		await expect(page.locator('h1')).toHaveText('non-greedy');
		await expect(page.locator('h2')).toHaveText('{"dynamic":"one","rest":"two/three"}');

		await clicknav('[href="/routing/rest/non-greedy/one-bard/two/three"]');
		await expect(page.locator('h1')).not.toHaveText('non-greedy');
	});

	test('reloads when navigating between ...rest pages', async ({ page, clicknav }) => {
		await page.goto('/routing/rest/path/one');
		await expect(page.locator('h1')).toHaveText('path: /routing/rest/path/one');

		await clicknav('[href="/routing/rest/path/two"]');
		await expect(page.locator('h1')).toHaveText('path: /routing/rest/path/two');

		await clicknav('[href="/routing/rest/path/three"]');
		await expect(page.locator('h1')).toHaveText('path: /routing/rest/path/three');
	});

	test('allows rest routes to have prefixes and suffixes', async ({ page }) => {
		await page.goto('/routing/rest/complex/prefix-one/two/three');
		await expect(page.locator('h1')).toHaveText('parts: one/two/three');
	});

	test('links to unmatched routes result in a full page navigation, not a 404', async ({
		page,
		clicknav
	}) => {
		await page.goto('/routing');
		await clicknav('[href="/static.json"]');
		await expect(page.locator('body')).toHaveText('"static file"\n');
	});

	test('navigation is cancelled upon subsequent navigation', async ({
		baseURL,
		page,
		clicknav
	}) => {
		await page.goto('/routing/cancellation');
		await page.locator('[href="/routing/cancellation/a"]').click();
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

	test('exposes page.route.id', async ({ page, clicknav }) => {
		await page.goto('/routing/route-id');
		await clicknav('[href="/routing/route-id/foo"]');

		await expect(page.locator('h1')).toHaveText('route.id in load: /routing/route-id/[x]');
		await expect(page.locator('h2')).toHaveText('route.id in store: /routing/route-id/[x]');
	});

	test('serves a page that clashes with a root directory', async ({ page }) => {
		await page.goto('/static');
		await expect(page.locator('h1')).toHaveText('hello');
	});

	test('shows "Not Found" in 404 case', async ({ page }) => {
		await page.goto('/404-fallback');
		await expect(page.locator('h1')).toHaveText('404');
		await expect(page.locator('p')).toHaveText(
			'This is your custom error page saying: "Not Found"'
		);
	});

	if (process.platform !== 'win32') {
		test('Respects symlinks', async ({ page, clicknav }) => {
			await page.goto('/routing');
			await clicknav('[href="/routing/symlink-from"]');

			await expect(page.locator('h1')).toHaveText('symlinked');
		});
	}

	test('trailing slash server with config always', async ({ page, clicknav }) => {
		await page.goto('/routing/trailing-slash-server');
		await clicknav('[href="/routing/trailing-slash-server/always"]');
		await expect(page.locator('[data-test-id="pathname-store"]')).toHaveText(
			'/routing/trailing-slash-server/always/'
		);
		await expect(page.locator('[data-test-id="pathname-data"]')).toHaveText(
			'/routing/trailing-slash-server/always/'
		);
	});

	test('trailing slash server with config ignore and no trailing slash in URL', async ({
		page,
		clicknav
	}) => {
		await page.goto('/routing/trailing-slash-server');
		await clicknav('[href="/routing/trailing-slash-server/ignore"]');
		await expect(page.locator('[data-test-id="pathname-store"]')).toHaveText(
			'/routing/trailing-slash-server/ignore'
		);
		await expect(page.locator('[data-test-id="pathname-data"]')).toHaveText(
			'/routing/trailing-slash-server/ignore'
		);
	});

	test('trailing slash server with config ignore and trailing slash in URL', async ({
		page,
		clicknav
	}) => {
		await page.goto('/routing/trailing-slash-server');
		await clicknav('[href="/routing/trailing-slash-server/ignore/"]');
		await expect(page.locator('[data-test-id="pathname-store"]')).toHaveText(
			'/routing/trailing-slash-server/ignore/'
		);
		await expect(page.locator('[data-test-id="pathname-data"]')).toHaveText(
			'/routing/trailing-slash-server/ignore/'
		);
	});

	test('trailing slash server with config never', async ({ page, clicknav }) => {
		await page.goto('/routing/trailing-slash-server');
		await clicknav('[href="/routing/trailing-slash-server/never/"]');
		await expect(page.locator('[data-test-id="pathname-store"]')).toHaveText(
			'/routing/trailing-slash-server/never'
		);
		await expect(page.locator('[data-test-id="pathname-data"]')).toHaveText(
			'/routing/trailing-slash-server/never'
		);
	});
});

test.describe('XSS', () => {
	test('replaces %sveltekit.xxx% tags safely', async ({ page }) => {
		await page.goto('/unsafe-replacement');

		await expect(page.locator('body')).toContainText('$& $&');
	});

	test('escapes inline data', async ({ page, javaScriptEnabled }) => {
		await page.goto('/xss');

		await expect(page.locator('h1')).toHaveText(
			'user.name is </script><script>window.pwned = 1</script>'
		);

		if (!javaScriptEnabled) {
			// @ts-expect-error - check global injected variable
			expect(await page.evaluate(() => window.pwned)).toBeUndefined();
		}
	});

	const uri_xss_payload = '</script><script>window.pwned=1</script>';
	const uri_xss_payload_encoded = encodeURIComponent(uri_xss_payload);

	test('no xss via dynamic route path', async ({ page }) => {
		await page.goto(`/xss/${uri_xss_payload_encoded}`);

		await expect(page.locator('h1')).toHaveText(uri_xss_payload);

		// @ts-expect-error - check global injected variable
		expect(await page.evaluate(() => window.pwned)).toBeUndefined();
	});

	test('no xss via query param', async ({ page }) => {
		await page.goto(`/xss/query?key=${uri_xss_payload_encoded}`);

		await expect(page.locator('#one')).toHaveText(JSON.stringify({ key: [uri_xss_payload] }));
		await expect(page.locator('#two')).toHaveText(JSON.stringify({ key: [uri_xss_payload] }));

		// @ts-expect-error - check global injected variable
		expect(await page.evaluate(() => window.pwned)).toBeUndefined();
	});

	test('no xss via shadow endpoint', async ({ page }) => {
		await page.goto('/xss/shadow');

		// @ts-expect-error - check global injected variable
		expect(await page.evaluate(() => window.pwned)).toBeUndefined();
		await expect(page.locator('h1')).toHaveText(
			'user.name is </script><script>window.pwned = 1</script>'
		);
	});

	test('no xss via tracked search parameters', async ({ page }) => {
		// https://github.com/sveltejs/kit/security/advisories/GHSA-6q87-84jw-cjhp
		await page.goto('/xss/query-tracking?</script/><script>window.pwned%3D1</script/>');

		// @ts-expect-error - check global injected variable
		expect(await page.evaluate(() => window.pwned)).toBeUndefined();
	});
});

test.describe('$app/server', () => {
	test('can read a file', async ({ page }) => {
		await page.goto('/read-file');

		// the emoji is there to check that base64 decoding works correctly
		await expect(page.locator('[data-testid="auto"]')).toHaveText('Imported without ?url 😎');
		await expect(page.locator('[data-testid="url"]')).toHaveText('Imported with ?url 😎');
		await expect(page.locator('[data-testid="local_glob"]')).toHaveText(
			'Imported with ?url via glob 😎'
		);
		await expect(page.locator('[data-testid="external_glob"]')).toHaveText(
			'Imported with url glob from the read-file test in basics. Placed here outside the app folder to force a /@fs prefix 😎'
		);

		const svg = await page.innerHTML('[data-testid="svg"]');
		expect(svg).toContain('<rect width="24" height="24" rx="2" fill="#ff3e00"></rect>');

		// check that paths in .css files are relative
		await expect(page.locator('[data-testid="styles"]')).toContainText('url(.');
	});
});
