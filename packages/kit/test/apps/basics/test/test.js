import { expect } from '@playwright/test';
import { start_server, test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('Imports', () => {
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
			expect(sources[1]).toBe(`${baseURL}/_app/immutable/assets/large-3183867c.jpg`);
		}
	});
});

test.describe('CSS', () => {
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

	test('applies imported styles in the correct order', async ({ page }) => {
		await page.goto('/css');

		const color = await page.$eval('.overridden', (el) => getComputedStyle(el).color);
		expect(color).toBe('rgb(0, 128, 0)');
	});
});

test.describe('Shadowed pages', () => {
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

	test('Handles GET redirects with cookies from fetch response', async ({
		page,
		context,
		clicknav
	}) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/redirect-get-with-cookie-from-fetch"]');
		expect(await page.textContent('h1')).toBe('Redirection was successful');

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
		expect(await page.textContent('h1')).toBe('Redirection was successful');
	});

	test('Handles POST redirects with cookies', async ({ page, context, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('#redirect-post-with-cookie');
		expect(await page.textContent('h1')).toBe('Redirection was successful');

		const cookies = await context.cookies();
		expect(cookies).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'shadow-redirect', value: 'happy' })])
		);
	});

	test('Handles POST success with returned location', async ({ page, clicknav }) => {
		await page.goto('/shadowed/post-success-redirect');
		await clicknav('button');
		expect(await page.textContent('h1')).toBe('POST was successful');
	});

	test('Renders error page for 4xx and 5xx responses from GET', async ({ page, clicknav }) => {
		await page.goto('/shadowed');
		await clicknav('[href="/shadowed/error-get"]');
		expect(await page.textContent('h1')).toBe('404');
	});

	test('Merges bodies for 4xx and 5xx responses from non-GET', async ({ page }) => {
		await page.goto('/shadowed');
		const [response] = await Promise.all([page.waitForNavigation(), page.click('#error-post')]);
		expect(await page.textContent('h1')).toBe('hello from get / echo: posted data');

		expect(response?.status()).toBe(400);
		expect(await page.textContent('h2')).toBe('status: 400');
	});

	test('Endpoint receives consistent URL', async ({ baseURL, page, clicknav }) => {
		await page.goto('/shadowed/same-render-entry');
		await clicknav('[href="/shadowed/same-render?param1=value1"]');
		expect(await page.textContent('h1')).toBe(`URL: ${baseURL}/shadowed/same-render?param1=value1`);
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

			expect(await page.textContent('h1')).toBe('500');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "Data returned from `load` while rendering /shadowed/serialization is not serializable: Cannot stringify arbitrary non-POJOs (data.nope)"'
			);
		});
	}
});

test.describe('Encoded paths', () => {
	test('visits a route with non-ASCII character', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/苗条"]');
		expect(await page.innerHTML('h1')).toBe('static');
		expect(decodeURI(await page.innerHTML('h2'))).toBe('/encoded/苗条');
		expect(decodeURI(await page.innerHTML('h3'))).toBe('/encoded/苗条');
	});

	test('visits a route with a doubly encoded space', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/test%2520me"]');
		expect(await page.innerHTML('h1')).toBe('dynamic');
		expect(await page.innerHTML('h2')).toBe('/encoded/test%2520me: test%20me');
		expect(await page.innerHTML('h3')).toBe('/encoded/test%2520me: test%20me');
	});

	test('visits a route with a doubly encoded slash', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/test%252fme"]');
		expect(await page.innerHTML('h1')).toBe('dynamic');
		expect(await page.innerHTML('h2')).toBe('/encoded/test%252fme: test%2fme');
		expect(await page.innerHTML('h3')).toBe('/encoded/test%252fme: test%2fme');
	});

	test('visits a route with an encoded slash', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/AC%2fDC"]');
		expect(await page.innerHTML('h1')).toBe('dynamic');
		expect(await page.innerHTML('h2')).toBe('/encoded/AC%2fDC: AC/DC');
		expect(await page.innerHTML('h3')).toBe('/encoded/AC%2fDC: AC/DC');
	});

	test('visits a route with an encoded bracket', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/%5b"]');
		expect(await page.innerHTML('h1')).toBe('dynamic');
		expect(await page.innerHTML('h2')).toBe('/encoded/%5b: [');
		expect(await page.innerHTML('h3')).toBe('/encoded/%5b: [');
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

	test('serializes JSON correctly', async ({ request }) => {
		const response = await request.get('/encoded/endpoint');
		expect(await response.json()).toEqual({
			fruit: '🍎🍇🍌'
		});
	});

	test('allows non-ASCII character in parameterized route segment', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/@svelte"]');
		expect(await page.textContent('h1')).toBe('@svelte');
	});

	test('allows characters to be represented as escape sequences', async ({ page, clicknav }) => {
		await page.goto('/encoded/escape-sequences');

		await clicknav('[href="/encoded/escape-sequences/:-)"]');
		expect(await page.textContent('h1')).toBe(':-)');

		await clicknav('[href="/encoded/escape-sequences/%23"]');
		expect(await page.textContent('h1')).toBe('#');

		await clicknav('[href="/encoded/escape-sequences/%2F"]');
		expect(await page.textContent('h1')).toBe('/');

		await clicknav('[href="/encoded/escape-sequences/%3f"]');
		expect(await page.textContent('h1')).toBe('?');

		await clicknav('[href="/encoded/escape-sequences/%25"]');
		expect(await page.textContent('h1')).toBe('%');

		await clicknav('[href="/encoded/escape-sequences/<"]');
		expect(await page.textContent('h1')).toBe('<');

		await clicknav('[href="/encoded/escape-sequences/1<2"]');
		expect(await page.textContent('h1')).toBe('1<2');

		await clicknav('[href="/encoded/escape-sequences/苗"]');
		expect(await page.textContent('h1')).toBe('苗');

		await clicknav('[href="/encoded/escape-sequences/🤪"]');
		expect(await page.textContent('h1')).toBe('🤪');
	});
});

test.describe('$env', () => {
	test('includes environment variables', async ({ page, clicknav }) => {
		await page.goto('/env/includes');

		expect(await page.textContent('#static-private')).toBe(
			'PRIVATE_STATIC: accessible to server-side code/replaced at build time'
		);
		expect(await page.textContent('#dynamic-private')).toBe(
			'PRIVATE_DYNAMIC: accessible to server-side code/evaluated at run time'
		);

		expect(await page.textContent('#static-public')).toBe(
			'PUBLIC_STATIC: accessible anywhere/replaced at build time'
		);
		expect(await page.textContent('#dynamic-public')).toBe(
			'PUBLIC_DYNAMIC: accessible anywhere/evaluated at run time'
		);

		await page.goto('/env');
		await clicknav('[href="/env/includes"]');

		expect(await page.textContent('#static-private')).toBe(
			'PRIVATE_STATIC: accessible to server-side code/replaced at build time'
		);
		expect(await page.textContent('#dynamic-private')).toBe(
			'PRIVATE_DYNAMIC: accessible to server-side code/evaluated at run time'
		);

		expect(await page.textContent('#static-public')).toBe(
			'PUBLIC_STATIC: accessible anywhere/replaced at build time'
		);
		expect(await page.textContent('#dynamic-public')).toBe(
			'PUBLIC_DYNAMIC: accessible anywhere/evaluated at run time'
		);
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
			test.fixme();

			await page.goto('/errors/module-scope-server');

			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe(
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

			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "a load function related to route \'/errors/invalid-load-response\' returned an array, but must return a plain object at the top level (i.e. `return {...}`)"'
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

			expect(await page.textContent('footer')).toBe('Custom layout');
			expect(await page.textContent('#message')).toBe(
				'This is your custom error page saying: "a load function related to route \'/errors/invalid-server-load-response\' returned an array, but must return a plain object at the top level (i.e. `return {...}`)"'
			);
		});
	}

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

	test('server-side error from load() is an Error', async ({ page }) => {
		const response = await page.goto('/errors/load-error-server');

		expect(await page.textContent('footer')).toBe('Custom layout');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Not found"'
		);
		expect(/** @type {Response} */ (response).status()).toBe(555);
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
		expect(await page.textContent('#message')).toBe('This is your custom error page saying: "500"');
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
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "nope"'
		);
	});

	test('not ok response from shadow endpoint', async ({ page, read_errors }) => {
		const res = await page.goto('/errors/endpoint-shadow-not-ok');

		expect(read_errors('/errors/endpoint-shadow-not-ok')).toBeUndefined();

		expect(res && res.status()).toBe(555);
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Error: 555"'
		);
	});

	test('prerendering a page with a mutative page endpoint results in a catchable error', async ({
		page
	}) => {
		await page.goto('/prerendering/mutative-endpoint');
		expect(await page.textContent('h1')).toBe('500');

		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Cannot prerender pages with actions"'
		);
	});

	test('page endpoint GET thrown error message is preserved', async ({
		page,
		clicknav,
		read_errors
	}) => {
		await page.goto('/errors/page-endpoint');
		await clicknav('#get-implicit');

		expect(await page.textContent('pre')).toBe(
			JSON.stringify({ status: 500, message: 'oops' }, null, '  ')
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

		expect(await page.textContent('pre')).toBe(
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

		expect(await page.textContent('pre')).toBe(
			JSON.stringify({ status: 500, message: 'oops' }, null, '  ')
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

		expect(await page.textContent('pre')).toBe(
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

test.describe('Load', () => {
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
			const script_contents = await page.innerHTML('script[data-sveltekit-fetched]');

			const payload = '{"status":200,"statusText":"","headers":{},"body":"{\\"b\\":2}"}';

			expect(script_contents).toBe(payload);
		}

		expect(requests.some((r) => r.endsWith('/load/serialization/fetched-from-shared.json'))).toBe(
			false
		);
	});

	test('POST fetches are serialized', async ({ page, javaScriptEnabled }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await page.goto('/load/serialization-post');

		expect(await page.textContent('h1')).toBe('a: X');
		expect(await page.textContent('h2')).toBe('b: Y');

		if (!javaScriptEnabled) {
			const payload_a = '{"status":200,"statusText":"","headers":{},"body":"X"}';
			const payload_b = '{"status":200,"statusText":"","headers":{},"body":"Y"}';
			// by the time JS has run, hydration will have nuked these scripts
			const script_contents_a = await page.innerHTML(
				'script[data-sveltekit-fetched][data-url="/load/serialization-post.json"][data-hash="3t25"]'
			);
			const script_contents_b = await page.innerHTML(
				'script[data-sveltekit-fetched][data-url="/load/serialization-post.json"][data-hash="3t24"]'
			);

			expect(script_contents_a).toBe(payload_a);
			expect(script_contents_b).toBe(payload_b);
		}

		expect(requests.some((r) => r.endsWith('/load/serialization.json'))).toBe(false);
	});

	test('POST fetches with Request init are serialized', async ({ page, javaScriptEnabled }) => {
		await page.goto('/load/serialization-post-request');

		expect(await page.textContent('h1')).toBe('a: X');
		expect(await page.textContent('h2')).toBe('b: Y');

		if (!javaScriptEnabled) {
			const payload_a = '{"status":200,"statusText":"","headers":{},"body":"X"}';
			const payload_b = '{"status":200,"statusText":"","headers":{},"body":"Y"}';
			// by the time JS has run, hydration will have nuked these scripts
			const script_contents_a = await page.innerHTML(
				'script[data-sveltekit-fetched][data-url="/load/serialization-post.json"][data-hash="3t25"]'
			);
			const script_contents_b = await page.innerHTML(
				'script[data-sveltekit-fetched][data-url="/load/serialization-post.json"][data-hash="3t24"]'
			);

			expect(script_contents_a).toBe(payload_a);
			expect(script_contents_b).toBe(payload_b);
		}
	});

	test('json string is returned', async ({ page }) => {
		await page.goto('/load/relay');
		expect(await page.textContent('h1')).toBe('42');
	});

	test('prefers static data over endpoint', async ({ page }) => {
		await page.goto('/load/foo');
		expect(await page.textContent('h1')).toBe('static file');
	});

	test('data is inherited', async ({ page, javaScriptEnabled, app }) => {
		for (const kind of ['shared', 'server']) {
			await page.goto(`/load/parent/${kind}/a/b/c`);
			expect(await page.textContent('h1')).toBe('message: original + new');
			expect(await page.textContent('pre')).toBe(
				JSON.stringify({
					foo: { bar: 'Custom layout' },
					message: 'original + new',
					x: 'a',
					y: 'b edited',
					z: 'c'
				})
			);

			if (javaScriptEnabled) {
				await app.goto(`/load/parent/${kind}/d/e/f`);

				expect(await page.textContent('h1')).toBe('message: original + new');
				expect(await page.textContent('pre')).toBe(
					JSON.stringify({
						foo: { bar: 'Custom layout' },
						message: 'original + new',
						x: 'd',
						y: 'e edited',
						z: 'f'
					})
				);
			}
		}
	});

	test('fetch accepts a Request object', async ({ page, clicknav }) => {
		await page.goto('/load');
		await clicknav('[href="/load/fetch-request"]');
		expect(await page.textContent('h1')).toBe('the answer is 42');
	});

	test('fetch resolves urls relatively to the target page', async ({ page, clicknav }) => {
		await page.goto('/load');
		await clicknav('[href="/load/fetch-relative"]');
		expect(await page.textContent('h1')).toBe('the answer is 42');
		expect(await page.textContent('h2')).toBe('the question was ?');
	});

	test('handles large responses', async ({ page }) => {
		await page.goto('/load');

		await page.goto('/load/large-response');
		expect(await page.textContent('h1')).toBe('text.length is 5000000');
	});

	test('handles external api', async ({ page }) => {
		/** @type {string[]} */
		const requested_urls = [];

		const { port, close } = await start_server(async (req, res) => {
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

		try {
			await page.goto(`/load/server-fetch-request?port=${port}`);

			expect(requested_urls).toEqual(['/server-fetch-request-modified.json']);
			expect(await page.textContent('h1')).toBe('the answer is 42');
		} finally {
			await close();
		}
	});

	test('makes credentialed fetches to endpoints by default', async ({
		page,
		clicknav,
		javaScriptEnabled
	}) => {
		if (javaScriptEnabled) return;
		await page.goto('/load');
		await clicknav('[href="/load/fetch-credentialed"]');
		expect(await page.textContent('h1')).toBe('Hello SvelteKit!');
	});

	test('includes correct page request headers', async ({
		baseURL,
		page,
		clicknav,
		javaScriptEnabled,
		browserName
	}) => {
		await page.goto('/load');
		await clicknav('[href="/load/fetch-request-headers"]');

		const json = /** @type {string} */ (await page.textContent('pre'));
		const headers = JSON.parse(json);

		if (javaScriptEnabled) {
			expect(headers).toEqual({
				accept: '*/*',
				'accept-language': 'en-US',
				// the referer will be the previous page in the client-side
				// navigation case
				referer: `${baseURL}/load`,
				// these headers aren't particularly useful, but they allow us to verify
				// that page headers are being forwarded
				'sec-fetch-dest': browserName === 'webkit' ? undefined : 'empty',
				'sec-fetch-mode': browserName === 'webkit' ? undefined : 'cors',
				connection: 'keep-alive'
			});
		} else {
			expect(headers).toEqual({
				accept: '*/*',
				'accept-language': 'en-US'
			});
		}
	});

	test('errors when trying to access non-serialized request headers on the server', async ({
		page,
		read_errors
	}) => {
		await page.goto('/load/fetch-request-headers-invalid-access');

		expect(read_errors(`/load/fetch-request-headers-invalid-access`).message).toContain(
			'Failed to get response header "content-type" — it must be included by the `filterSerializedResponseHeaders` option'
		);
	});

	test('exposes rawBody as a DataView to endpoints', async ({ page, clicknav }) => {
		await page.goto('/load/raw-body');
		await clicknav('[href="/load/raw-body/dataview"]');

		expect(await page.innerHTML('.parsed')).toBe('{"oddly":{"formatted":"json"}}');
		expect(await page.innerHTML('.raw')).toBe('{ "oddly" : { "formatted" : "json" } }');
	});

	test('exposes rawBody as a string to endpoints', async ({ page, clicknav }) => {
		await page.goto('/load/raw-body');
		await clicknav('[href="/load/raw-body/string"]');

		expect(await page.innerHTML('.parsed')).toBe('{"oddly":{"formatted":"json"}}');
		expect(await page.innerHTML('.raw')).toBe('{ "oddly" : { "formatted" : "json" } }');
	});

	test('exposes rawBody as a Uint8Array to endpoints', async ({ page, clicknav }) => {
		await page.goto('/load/raw-body');
		await clicknav('[href="/load/raw-body/uint8array"]');

		expect(await page.innerHTML('.parsed')).toBe('{"oddly":{"formatted":"json"}}');
		expect(await page.innerHTML('.raw')).toBe('{ "oddly" : { "formatted" : "json" } }');
	});

	test('server-side fetch respects set-cookie header', async ({ page, context }) => {
		await context.clearCookies();

		await page.goto('/load/set-cookie-fetch');
		expect(await page.textContent('h1')).toBe('the answer is 42');

		/** @type {Record<string,string>} */
		const cookies = {};
		for (const cookie of await context.cookies()) {
			cookies[cookie.name] = cookie.value;
		}

		expect(cookies.answer).toBe('42');
		expect(cookies.doubled).toBe('84');
	});

	test('CSS for dynamically imported components is reflected in server render', async ({
		page
	}) => {
		await page.goto('/load/dynamic-import-styles');
		expect(
			await page.evaluate(() => {
				const el = document.querySelector('#thing');
				return el && getComputedStyle(el).color;
			})
		).toBe('rgb(255, 0, 0)');
	});

	test('page without load has access to layout data', async ({ page, clicknav }) => {
		await page.goto('/load/accumulated');

		await clicknav('[href="/load/accumulated/without-page-data"]');
		expect(await page.textContent('h1')).toBe('foo.bar: Custom layout');
	});

	test('page with load has access to layout data', async ({ page, clicknav }) => {
		await page.goto('/load/accumulated');

		await clicknav('[href="/load/accumulated/with-page-data"]');
		expect(await page.textContent('h1')).toBe('foo.bar: Custom layout');
		expect(await page.textContent('h2')).toBe('pagedata: pagedata');
	});

	test('Serializes non-JSON data', async ({ page, clicknav }) => {
		await page.goto('/load/devalue');
		await clicknav('[href="/load/devalue/regex"]');

		expect(await page.textContent('h1')).toBe('true');
	});

	test('CORS errors are simulated server-side for shared load functions', async ({
		page,
		read_errors
	}) => {
		const { port, close } = await start_server(async (req, res) => {
			res.end('hello');
		});

		await page.goto(`/load/cors?port=${port}`);
		expect(await page.textContent('h1')).toBe('500');
		expect(read_errors(`/load/cors`).message).toContain(
			`CORS error: No 'Access-Control-Allow-Origin' header is present on the requested resource`
		);

		await page.goto(`/load/cors/no-cors?port=${port}`);
		expect(await page.textContent('h1')).toBe('result: ');

		await close();
	});

	test('CORS errors are skipped for server-only load functions', async ({ page }) => {
		const { port, close } = await start_server(async (req, res) => {
			res.end('hello');
		});

		await page.goto(`/load/cors/server-only?port=${port}`);
		expect(await page.textContent('h1')).toBe('hello');

		await close();
	});
});

test.describe('Nested layouts', () => {
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

		expect(await page.textContent('h1')).toBe('Layout reset');
		expect(await page.textContent('h2')).toBe('Hello');
		expect(await page.$('#nested')).toBeNull();
	});

	test('renders the closest error page', async ({ page, clicknav }) => {
		await page.goto('/errors/nested-error-page');

		await clicknav('[href="/errors/nested-error-page/nope"]');

		expect(await page.textContent('h1')).toBe('Nested error page');
		expect(await page.textContent('#nested-error-status')).toBe('status: 500');
		expect(await page.textContent('#nested-error-message')).toBe('error.message: nope');
	});
});

test.describe('Page options', () => {
	test('does not include <script> or <link rel="modulepreload"> with csr=false', async ({
		page,
		javaScriptEnabled
	}) => {
		if (!javaScriptEnabled) {
			await page.goto('/no-csr');
			expect(await page.textContent('h1')).toBe('look ma no javascript');
			expect(
				await page.evaluate(() => document.querySelectorAll('link[rel="modulepreload"]').length)
			).toBe(0);

			// ensure data wasn't inlined
			expect(
				await page.evaluate(
					() => document.querySelectorAll('script[sveltekit\\:data-type="data"]').length
				)
			).toBe(0);
		}
	});

	test('does not SSR page with ssr=false', async ({ page, javaScriptEnabled }) => {
		await page.goto('/no-ssr');

		if (javaScriptEnabled) {
			expect(await page.textContent('h1')).toBe('content was rendered');
		} else {
			expect(await page.evaluate(() => document.querySelector('h1'))).toBe(null);
			expect(await page.evaluate(() => document.querySelector('style[data-sveltekit]'))).toBe(null);
		}
	});

	test('does not SSR error page for 404s with ssr=false', async ({ request }) => {
		const html = await request.get('/no-ssr/missing');
		expect(await html.text()).not.toContain('load function was called erroneously');
	});

	// TODO move this test somewhere more suitable
	test('transformPageChunk can change the html output', async ({ page }) => {
		await page.goto('/transform-page-chunk');
		expect(await page.getAttribute('meta[name="transform-page"]', 'content')).toBe('Worked!');
	});
});

test.describe('$app/environment', () => {
	test('includes version', async ({ page }) => {
		await page.goto('/app-environment');
		expect(await page.textContent('h1')).toBe('TEST_VERSION');
	});
});

test.describe('$app/paths', () => {
	test('includes paths', async ({ page }) => {
		await page.goto('/paths');

		expect(await page.innerHTML('pre')).toBe(
			JSON.stringify({
				base: '',
				assets: ''
			})
		);
	});

	// some browsers will re-request assets after a `pushState`
	// https://github.com/sveltejs/kit/issues/3748#issuecomment-1125980897
	test('replaces %sveltekit.assets% in template with relative path, and makes it absolute in the client', async ({
		baseURL,
		page,
		javaScriptEnabled
	}) => {
		const absolute = `${baseURL}/favicon.png`;

		await page.goto('/');
		expect(await page.getAttribute('link[rel=icon]', 'href')).toBe(
			javaScriptEnabled ? absolute : './favicon.png'
		);

		await page.goto('/routing');
		expect(await page.getAttribute('link[rel=icon]', 'href')).toBe(
			javaScriptEnabled ? absolute : './favicon.png'
		);

		await page.goto('/routing/rest/foo/bar/baz');
		expect(await page.getAttribute('link[rel=icon]', 'href')).toBe(
			javaScriptEnabled ? absolute : '../../../../favicon.png'
		);
	});
});

test.describe('$app/stores', () => {
	test('can access page.url', async ({ baseURL, page }) => {
		await page.goto('/origin');
		expect(await page.textContent('h1')).toBe(baseURL);
	});

	test('page store contains data', async ({ page, clicknav }) => {
		await page.goto('/store/data/www');

		const foo = { bar: 'Custom layout' };

		expect(await page.textContent('#store-data')).toBe(
			JSON.stringify({ foo, name: 'SvelteKit', value: 456, page: 'www' })
		);

		await clicknav('a[href="/store/data/zzz"]');
		expect(await page.textContent('#store-data')).toBe(
			JSON.stringify({ foo, name: 'SvelteKit', value: 456, page: 'zzz' })
		);

		await clicknav('a[href="/store/data/xxx"]');
		expect(await page.textContent('#store-data')).toBe(
			JSON.stringify({ foo, name: 'SvelteKit', value: 123 })
		);
		expect(await page.textContent('#store-error')).toBe('Params = xxx');

		await clicknav('a[href="/store/data/yyy"]');
		expect(await page.textContent('#store-data')).toBe(
			JSON.stringify({ foo, name: 'SvelteKit', value: 123 })
		);
		expect(await page.textContent('#store-error')).toBe('Params = yyy');
	});

	test('should load data after reloading by goto', async ({
		page,
		clicknav,
		javaScriptEnabled
	}) => {
		await page.goto('/store/data/foo?reset=true');
		const stuff1 = { foo: { bar: 'Custom layout' }, name: 'SvelteKit', value: 123 };
		const stuff2 = { ...stuff1, foo: true, number: 2 };
		const stuff3 = { ...stuff2 };
		await page.goto('/store/data/www');

		await clicknav('a[href="/store/data/foo"]');
		expect(JSON.parse(await page.textContent('#store-data'))).toEqual(stuff1);

		await clicknav('#reload-button');
		expect(JSON.parse(await page.textContent('#store-data'))).toEqual(
			javaScriptEnabled ? stuff2 : stuff1
		);

		await clicknav('a[href="/store/data/zzz"]');
		await clicknav('a[href="/store/data/foo"]');
		expect(JSON.parse(await page.textContent('#store-data'))).toEqual(stuff3);
	});

	test('navigating store contains from, to and type', async ({ app, page, javaScriptEnabled }) => {
		await page.goto('/store/navigating/a');

		expect(await page.textContent('#nav-status')).toBe('not currently navigating');

		if (javaScriptEnabled) {
			await app.preloadCode('/store/navigating/b');

			const res = await Promise.all([
				page.click('a[href="/store/navigating/b"]'),
				page.textContent('#navigating')
			]);

			expect(res[1]).toBe('navigating from /store/navigating/a to /store/navigating/b (link)');

			await page.waitForSelector('#not-navigating');
			expect(await page.textContent('#nav-status')).toBe('not currently navigating');

			await Promise.all([
				expect(page.locator('#navigating')).toHaveText(
					'navigating from /store/navigating/b to /store/navigating/a (popstate)'
				),
				page.goBack()
			]);
		}
	});

	test('navigating store clears after aborted navigation', async ({ page, javaScriptEnabled }) => {
		await page.goto('/store/navigating/a');

		expect(await page.textContent('#nav-status')).toBe('not currently navigating');

		if (javaScriptEnabled) {
			await page.click('a[href="/store/navigating/c"]');
			await page.waitForTimeout(100); // gross, but necessary since no navigation occurs
			await page.click('a[href="/store/navigating/a"]');

			await page.waitForSelector('#not-navigating', { timeout: 5000 });
			expect(await page.textContent('#nav-status')).toBe('not currently navigating');
		}
	});
});

test.describe('searchParams', () => {
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

test.describe('Redirects', () => {
	test('redirect', async ({ baseURL, page, clicknav }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/a"]');

		await page.waitForURL('/redirect/c');
		expect(await page.textContent('h1')).toBe('c');
		expect(page.url()).toBe(`${baseURL}/redirect/c`);

		await page.goBack();
		expect(page.url()).toBe(`${baseURL}/redirect`);
	});

	test('prevents redirect loops', async ({ baseURL, page, javaScriptEnabled, browserName }) => {
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
		expect(await page.textContent('h1')).toBe('500');
		expect(await page.textContent('#message')).toBe(
			`This is your custom error page saying: "${message}"`
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
		expect(await page.textContent('h1')).toBe('500');
		expect(await page.textContent('#message')).toBe(
			`This is your custom error page saying: "${message}"`
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

	test('redirect response in handle hook', async ({ baseURL, clicknav, page }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/in-handle?response"]');

		await page.waitForURL('/redirect/c');
		expect(await page.textContent('h1')).toBe('c');
		expect(page.url()).toBe(`${baseURL}/redirect/c`);

		await page.goBack();
		expect(page.url()).toBe(`${baseURL}/redirect`);
	});

	test('throw redirect in handle hook', async ({ baseURL, clicknav, page }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/in-handle?throw"]');

		await page.waitForURL('/redirect/c');
		expect(await page.textContent('h1')).toBe('c');
		expect(page.url()).toBe(`${baseURL}/redirect/c`);

		await page.goBack();
		expect(page.url()).toBe(`${baseURL}/redirect`);
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

	test('does not attempt client-side navigation to server routes', async ({ page }) => {
		await page.goto('/routing');
		await page.click('[href="/routing/ambiguous/ok.json"]');
		await page.waitForLoadState('networkidle');
		expect(await page.textContent('body')).toBe('ok');
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

	test('back button returns to initial route', async ({ page, clicknav }) => {
		await page.goto('/routing');
		await clicknav('[href="/routing/a"]');

		await page.goBack();
		await page.waitForLoadState('networkidle');
		expect(await page.textContent('h1')).toBe('Great success!');
	});

	test('back button returns to previous route when previous route has been navigated to via hash anchor', async ({
		page,
		clicknav
	}) => {
		await page.goto('/routing/hashes/a');

		await page.click('[href="#hash-target"]');
		await clicknav('[href="/routing/hashes/b"]');

		await page.goBack();
		expect(await page.textContent('h1')).toBe('a');
	});

	test('focus works if page load has hash', async ({ page, browserName }) => {
		await page.goto('/routing/hashes/target#p2');

		await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
		await page.waitForTimeout(50); // give browser a bit of time to complete the native behavior of the key press
		expect(
			await page.evaluate(
				() => document.activeElement?.textContent || 'ERROR: document.activeElement not set'
			)
		).toBe('next focus element');
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

	test('last parameter in a segment wins in cases of ambiguity', async ({ page, clicknav }) => {
		await page.goto('/routing/split-params');
		await clicknav('[href="/routing/split-params/x-y-z"]');
		expect(await page.textContent('h1')).toBe('x');
		expect(await page.textContent('h2')).toBe('y-z');
	});

	test('ignores navigation to URLs the app does not own', async ({ page }) => {
		const { port, close } = await start_server((req, res) => res.end('ok'));

		try {
			await page.goto(`/routing?port=${port}`);
			await Promise.all([
				page.click(`[href="http://localhost:${port}"]`),
				page.waitForURL(`http://localhost:${port}/`)
			]);
		} finally {
			await close();
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

	test('rest parameters do not swallow characters', async ({ page, clicknav }) => {
		await page.goto('/routing/rest/non-greedy');

		await clicknav('[href="/routing/rest/non-greedy/foo/one/two"]');
		expect(await page.textContent('h1')).toBe('non-greedy');
		expect(await page.textContent('h2')).toBe('{"rest":"one/two"}');

		await clicknav('[href="/routing/rest/non-greedy/food/one/two"]');
		expect(await page.textContent('h1')).not.toBe('non-greedy');

		await page.goBack();

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

	test('exposes page.route.id', async ({ page, clicknav }) => {
		await page.goto('/routing/route-id');
		await clicknav('[href="/routing/route-id/foo"]');

		expect(await page.textContent('h1')).toBe('route.id in load: /routing/route-id/[x]');
		expect(await page.textContent('h2')).toBe('route.id in store: /routing/route-id/[x]');
	});

	test('serves a page that clashes with a root directory', async ({ page }) => {
		await page.goto('/static');
		expect(await page.textContent('h1')).toBe('hello');
	});

	test('shows "Not Found" in 404 case', async ({ page }) => {
		await page.goto('/404-fallback');
		expect(await page.textContent('h1')).toBe('404');
		expect(await page.textContent('p')).toBe('This is your custom error page saying: "Not Found"');
	});

	if (process.platform !== 'win32') {
		test('Respects symlinks', async ({ page, clicknav }) => {
			await page.goto('/routing');
			await clicknav('[href="/routing/symlink-from"]');

			expect(await page.textContent('h1')).toBe('symlinked');
		});
	}
});

test.describe('Matchers', () => {
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

test.describe('XSS', () => {
	test('replaces %sveltekit.xxx% tags safely', async ({ page }) => {
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

	const uri_xss_payload = '</script><script>window.pwned=1</script>';
	const uri_xss_payload_encoded = encodeURIComponent(uri_xss_payload);

	test('no xss via dynamic route path', async ({ page }) => {
		await page.goto(`/xss/${uri_xss_payload_encoded}`);

		expect(await page.textContent('h1')).toBe(uri_xss_payload);

		// @ts-expect-error - check global injected variable
		expect(await page.evaluate(() => window.pwned)).toBeUndefined();
	});

	test('no xss via query param', async ({ page }) => {
		await page.goto(`/xss/query?key=${uri_xss_payload_encoded}`);

		expect(await page.textContent('#one')).toBe(JSON.stringify({ key: [uri_xss_payload] }));
		expect(await page.textContent('#two')).toBe(JSON.stringify({ key: [uri_xss_payload] }));

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

test.describe('Actions', () => {
	test('Error props are returned', async ({ page, javaScriptEnabled }) => {
		await page.goto('/actions/form-errors');
		await page.click('button');
		expect(await page.textContent('p.server-prop')).toBe('an error occurred');
		if (javaScriptEnabled) {
			expect(await page.textContent('p.client-prop')).toBe('hydrated: an error occurred');
		}
	});

	test('Form fields are persisted', async ({ page, javaScriptEnabled }) => {
		await page.goto('/actions/form-errors-persist-fields');
		await page.type('input[name="username"]', 'foo');
		await page.type('input[name="password"]', 'bar');
		await Promise.all([
			page.waitForRequest((request) =>
				request.url().includes('/actions/form-errors-persist-fields')
			),
			page.click('button')
		]);
		expect(await page.inputValue('input[name="username"]')).toBe('foo');
		if (javaScriptEnabled) {
			expect(await page.inputValue('input[name="password"]')).toBe('bar');
			expect(await page.textContent('pre')).toBe(JSON.stringify({ username: 'foo' }));
		} else {
			expect(await page.inputValue('input[name="password"]')).toBe('');
		}
	});

	test('Success data as form-data is returned', async ({ page }) => {
		await page.goto('/actions/success-data');

		expect(await page.textContent('pre')).toBe(JSON.stringify(null));

		await page.type('input[name="username"]', 'foo');
		await Promise.all([
			page.waitForRequest((request) => request.url().includes('/actions/success-data')),
			page.click('button[formenctype="multipart/form-data"]')
		]);

		await expect(page.locator('pre')).toHaveText(JSON.stringify({ result: 'foo' }));
	});

	test('Success data as form-urlencoded is returned', async ({ page }) => {
		await page.goto('/actions/success-data');

		expect(await page.textContent('pre')).toBe(JSON.stringify(null));

		await page.type('input[name="username"]', 'bar');
		await Promise.all([
			page.waitForRequest((request) => request.url().includes('/actions/success-data')),
			page.click('button[formenctype="application/x-www-form-urlencoded"]')
		]);

		await expect(page.locator('pre')).toHaveText(JSON.stringify({ result: 'bar' }));
	});

	test('applyAction updates form prop', async ({ page, javaScriptEnabled }) => {
		await page.goto('/actions/update-form');
		expect(await page.textContent('pre')).toBe(JSON.stringify(null));

		if (javaScriptEnabled) {
			await page.click('button.increment-success');
			await expect(page.locator('pre')).toHaveText(JSON.stringify({ count: 0 }));

			await page.click('button.increment-invalid');
			await expect(page.locator('pre')).toHaveText(JSON.stringify({ count: 1 }));
		}
	});

	test('form prop stays after invalidation and is reset on navigation', async ({
		page,
		app,
		javaScriptEnabled
	}) => {
		await page.goto('/actions/update-form');
		expect(await page.textContent('pre')).toBe(JSON.stringify(null));

		if (javaScriptEnabled) {
			await page.click('button.increment-success');
			await expect(page.locator('pre')).toHaveText(JSON.stringify({ count: 0 }));

			await page.click('button.invalidateAll');
			await page.waitForTimeout(500);
			await expect(page.locator('pre')).toHaveText(JSON.stringify({ count: 0 }));
			await app.goto('/actions/enhance');
		} else {
			await page.goto('/actions/enhance');
		}

		expect(await page.textContent('pre')).toBe(JSON.stringify(null));
	});

	test('applyAction redirects', async ({ page, javaScriptEnabled }) => {
		await page.goto('/actions/update-form');
		expect(await page.textContent('pre')).toBe(JSON.stringify(null));

		if (javaScriptEnabled) {
			await page.click('button.redirect');
			await expect(page.locator('footer')).toHaveText('Custom layout');
		}
	});

	test('applyAction errors', async ({ page, javaScriptEnabled }) => {
		await page.goto('/actions/update-form');
		expect(await page.textContent('pre')).toBe(JSON.stringify(null));

		if (javaScriptEnabled) {
			await page.click('button.error');
			await expect(page.locator('p')).toHaveText(
				'This is your custom error page saying: "Unexpected Form Error"'
			);
		}
	});

	test('use:enhance', async ({ page }) => {
		await page.goto('/actions/enhance');

		expect(await page.textContent('pre.formdata1')).toBe(JSON.stringify(null));
		expect(await page.textContent('pre.formdata2')).toBe(JSON.stringify(null));

		await page.type('input[name="username"]', 'foo');
		await Promise.all([
			page.waitForRequest((request) => request.url().includes('/actions/enhance')),
			page.click('button.form1')
		]);

		await expect(page.locator('pre.formdata1')).toHaveText(JSON.stringify({ result: 'foo' }));
		await expect(page.locator('pre.formdata2')).toHaveText(JSON.stringify({ result: 'foo' }));
		await expect(page.locator('input[name=username]')).toHaveValue('');
	});

	test('use:enhance abort controller', async ({ page, javaScriptEnabled }) => {
		await page.goto('/actions/enhance');

		expect(await page.textContent('span.count')).toBe('0');

		if (javaScriptEnabled) {
			await Promise.all([
				page.waitForRequest((request) => request.url().includes('/actions/enhance')),
				page.click('button.form2'),
				page.click('button.form2')
			]);
			await page.waitForTimeout(500); // to make sure locator doesn't run exactly between submission 1 and 2

			await expect(page.locator('span.count')).toHaveText('1');
		}
	});

	test('use:enhance button with formAction', async ({ page, app }) => {
		await page.goto('/actions/enhance');

		expect(await page.textContent('pre.formdata1')).toBe(JSON.stringify(null));

		await page.type('input[name="username"]', 'foo');
		await Promise.all([
			page.waitForRequest((request) => request.url().includes('/actions/enhance')),
			page.click('button.form1-register')
		]);

		await expect(page.locator('pre.formdata1')).toHaveText(
			JSON.stringify({ result: 'register: foo' })
		);
	});

	test('use:enhance button with name', async ({ page, app }) => {
		await page.goto('/actions/enhance');

		expect(await page.textContent('pre.formdata1')).toBe(JSON.stringify(null));

		await Promise.all([
			page.waitForRequest((request) => request.url().includes('/actions/enhance')),
			page.click('button.form1-submitter')
		]);

		await expect(page.locator('pre.formdata1')).toHaveText(
			JSON.stringify({ result: 'submitter: foo' })
		);
	});

	test('redirect', async ({ page, javaScriptEnabled }) => {
		await page.goto('/actions/redirect');

		page.click('button');

		const [redirect] = await Promise.all([
			page.waitForResponse('/actions/redirect'),
			page.waitForNavigation()
		]);
		if (javaScriptEnabled) {
			expect(await redirect.json()).toEqual({
				type: 'redirect',
				location: '/actions/enhance',
				status: 303
			});
		} else {
			expect(redirect.status()).toBe(303);
			expect(redirect.headers()['location']).toBe('/actions/enhance');
		}

		expect(page.url()).toContain('/actions/enhance');
	});

	test('$page.status reflects error status', async ({ page, app }) => {
		await page.goto('/actions/enhance');

		await Promise.all([
			page.waitForRequest((request) => request.url().includes('/actions/enhance')),
			page.click('button.form1-error')
		]);

		await expect(page.locator('h1')).toHaveText('400');
	});
});

// Run in serial to not pollute the log with (correct) cookie warnings
test.describe.serial('Cookies API', () => {
	// there's a problem running these tests in the CI with webkit,
	// since AFAICT the browser is using http://localhost and webkit won't
	// set a `Secure` cookie on that. So we bail...
	test.skip(({ browserName }) => browserName === 'webkit');

	test('sanity check for cookies', async ({ page }) => {
		await page.goto('/cookies');
		const span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('undefined');
	});

	test('set a cookie', async ({ page }) => {
		await page.goto('/cookies/set');
		const span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('teapot');
	});

	test('delete a cookie', async ({ page }) => {
		await page.goto('/cookies/set');
		let span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('teapot');
		await page.goto('/cookies/delete');
		span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('undefined');
	});

	test('more than one cookie can be set in one request', async ({ page }) => {
		await page.goto('/cookies/set-more-than-one');
		const span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('teapot');
		expect(await span.innerText()).toContain('jane austen');
	});

	test('default encoding and decoding', async ({ page }) => {
		await page.goto('/cookies/encoding/set');
		const span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('teapot, jane austen');
	});

	test('not decoded twice', async ({ page }) => {
		await page.goto('/cookies/encoding/not-decoded-twice');
		const span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('teapot%2C%20jane%20austen');
	});

	test('can be set in +layout.server.js', async ({ page }) => {
		await page.goto('/cookies/set-in-layout');
		const span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('i was set in the layout load');
	});

	test('works with basic enhance', async ({ page }) => {
		await page.goto('/cookies/enhanced/basic');
		let span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('undefined');

		await page.click('button#teapot');
		await expect(page.locator('#cookie-value')).toHaveText('teapot');

		// setting a different value...
		await page.click('button#janeAusten');
		await expect(page.locator('#cookie-value')).toHaveText('Jane Austen');
	});

	test('cookies can be set with a path', async ({ page }) => {
		await page.goto('/cookies/nested/a');
		let span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('teapot');
		await page.goto('/cookies/nested/b');
		span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('undefined');
		await page.goto('/cookies');
		span = page.locator('#cookie-value');
		expect(await span.innerText()).toContain('undefined');
	});
});
