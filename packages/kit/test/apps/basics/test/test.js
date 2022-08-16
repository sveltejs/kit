import { expect } from '@playwright/test';
import { start_server, test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('a11y', () => {
	test('resets focus', async ({ page, clicknav, browserName }) => {
		const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';

		await page.goto('/accessibility/a');

		await clicknav('[href="/accessibility/b"]');
		expect(await page.innerHTML('h1')).toBe('b');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BODY');
		await page.keyboard.press(tab);

		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BUTTON');
		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toBe('focus me');

		await clicknav('[href="/accessibility/a"]');
		expect(await page.innerHTML('h1')).toBe('a');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BODY');

		await page.keyboard.press(tab);
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BUTTON');
		expect(await page.evaluate(() => (document.activeElement || {}).textContent)).toBe('focus me');

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
				return -1;
			})
		).toBe(1);

		await clicknav('[href="/selection/b"]');
		expect(
			await page.evaluate(() => {
				const selection = getSelection();
				if (selection) {
					return selection.rangeCount;
				}
				return -1;
			})
		).toBe(0);
	});
});

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

	test('Handles POST redirects', async ({ page }) => {
		await page.goto('/shadowed');
		await Promise.all([page.waitForNavigation(), page.click('#redirect-post')]);
		await expect(page.locator('h1')).toHaveText('Redirection was successful');
	});

	test('Handles POST redirects with cookies', async ({ page, context }) => {
		await page.goto('/shadowed');
		await Promise.all([page.waitForNavigation(), page.click('#redirect-post-with-cookie')]);
		await expect(page.locator('h1')).toHaveText('Redirection was successful');

		const cookies = await context.cookies();
		expect(cookies).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'shadow-redirect', value: 'happy' })])
		);
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

	test('allows %-encoded characters in directory names', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/$SVLT"]');
		await expect(page.locator('h1')).toHaveText('$SVLT');
	});

	test('allows %-encoded characters in filenames', async ({ page, clicknav }) => {
		await page.goto('/encoded');
		await clicknav('[href="/encoded/@svelte"]');
		await expect(page.locator('h1')).toHaveText('@svelte');
	});
});

test.describe('Env', () => {
	test('includes environment variables', async ({ page }) => {
		await page.goto('/env');

		await expect(page.locator('#static-private')).toHaveText(
			'PRIVATE_STATIC: accessible to server-side code/replaced at build time'
		);
		await expect(page.locator('#dynamic-private')).toHaveText(
			'PRIVATE_DYNAMIC: accessible to server-side code/evaluated at run time'
		);

		await expect(page.locator('#static-public')).toHaveText(
			'PUBLIC_STATIC: accessible anywhere/replaced at build time'
		);
		await expect(page.locator('#dynamic-public')).toHaveText(
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

			await expect(page.locator('footer')).toHaveText('Custom layout');
			await expect(page.locator('#message')).toHaveText(
				'This is your custom error page saying: "Crashing now"'
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
	}

	test('server-side load errors', async ({ page }) => {
		await page.goto('/errors/load-server');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
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

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Not found: /why/would/anyone/fetch/this/url"'
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

	test('error in endpoint', async ({ page, read_errors }) => {
		const res = await page.goto('/errors/endpoint');

		// should include stack trace
		const lines = read_errors('/errors/endpoint.json').split('\n');
		expect(lines[0]).toMatch('nope');

		if (process.env.DEV) {
			expect(lines[1]).toMatch('endpoint.json');
		}

		expect(res && res.status()).toBe(500);
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "500"'
		);

		const contents = await page.textContent('#stack');
		const location = '+page.js:7:9';

		if (process.env.DEV) {
			expect(contents).toMatch(location);
		} else {
			expect(contents).not.toMatch(location);
		}
	});

	test('error in shadow endpoint', async ({ page, read_errors }) => {
		const location = '+page.server.js:3:8';

		const res = await page.goto('/errors/endpoint-shadow');

		// should include stack trace
		const lines = read_errors('/errors/endpoint-shadow').split('\n');
		expect(lines[0]).toMatch('nope');

		if (process.env.DEV) {
			expect(lines[1]).toMatch(location);
		}

		expect(res && res.status()).toBe(500);
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "nope"'
		);

		const contents = await page.textContent('#stack');

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
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Error: 555"'
		);
	});

	test('error thrown in handle results in a rendered error page', async ({ page }) => {
		await page.goto('/errors/error-in-handle');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Error in handle"'
		);
		expect(await page.innerHTML('h1')).toBe('500');
	});

	test('prerendering a page whose load accesses session results in a catchable error', async ({
		page
	}) => {
		await page.goto('/prerendering');
		await expect(page.locator('h1')).toHaveText(
			'500: Attempted to access session from a prerendered page. Session would never be populated.'
		);
	});

	test('prerendering a page with a mutative page endpoint results in a catchable error', async ({
		page
	}) => {
		await page.goto('/prerendering/mutative-endpoint');
		await expect(page.locator('h1')).toHaveText('500');

		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Cannot prerender pages that have endpoints with mutative methods"'
		);
	});

	test('page endpoint GET thrown error message is preserved', async ({
		page,
		clicknav,
		read_errors
	}) => {
		await page.goto('/errors/page-endpoint');
		await clicknav('#get-implicit');
		await expect(page.locator('pre')).toHaveText(/.+/); // await text to be populated
		const json = await page.textContent('pre');
		if (!json) throw new Error('Could not extract content from element');
		const { status, name, message, stack, fancy } = JSON.parse(json);

		expect(status).toBe(500);
		expect(name).toBe('FancyError');
		expect(message).toBe('oops');
		expect(fancy).toBe(true);

		if (process.env.DEV) {
			const lines = stack.split('\n');
			expect(lines[1]).toContain('+page.server.js:4:8');
		}

		const error = read_errors('/errors/page-endpoint/get-implicit');
		expect(error).toContain('oops');
	});

	test('page endpoint GET HttpError message is preserved', async ({
		page,
		clicknav,
		read_errors
	}) => {
		await page.goto('/errors/page-endpoint');
		await clicknav('#get-explicit');
		await expect(page.locator('pre')).toHaveText(/.+/); // await text to be populated
		const json = await page.textContent('pre');
		if (!json) throw new Error('Could not extract content from element');
		const { status, message, stack } = JSON.parse(json);

		expect(status).toBe(400);
		expect(message).toBe('oops');
		expect(stack).toBeUndefined();

		const error = read_errors('/errors/page-endpoint/get-explicit');
		expect(error).toBe(undefined);
	});

	test('page endpoint POST unexpected error message is preserved', async ({
		page,
		read_errors
	}) => {
		// The case where we're submitting a POST request via a form.
		// It should show the __error template with our message.
		await page.goto('/errors/page-endpoint');
		await Promise.all([page.waitForNavigation(), page.click('#post-implicit')]);
		await expect(page.locator('pre')).toHaveText(/.+/); // await text to be populated
		const json = await page.textContent('pre');
		if (!json) throw new Error('Could not extract content from element');
		const { status, name, message, stack, fancy } = JSON.parse(json);

		expect(status).toBe(500);
		expect(name).toBe('FancyError');
		expect(message).toBe('oops');
		expect(fancy).toBe(true);

		if (process.env.DEV) {
			const lines = stack.split('\n');
			expect(lines[1]).toContain('+page.server.js:4:8');
		}

		const error = read_errors('/errors/page-endpoint/post-implicit');
		expect(error).toContain('oops');
	});

	test('page endpoint POST HttpError error message is preserved', async ({ page, read_errors }) => {
		// The case where we're submitting a POST request via a form.
		// It should show the __error template with our message.
		await page.goto('/errors/page-endpoint');
		await Promise.all([page.waitForNavigation(), page.click('#post-explicit')]);
		await expect(page.locator('pre')).toHaveText(/.+/); // await text to be populated
		const json = await page.textContent('pre');
		if (!json) throw new Error('Could not extract content from element');
		const { status, message, stack } = JSON.parse(json);

		expect(status).toBe(400);
		expect(message).toBe('oops');
		expect(stack).toBeUndefined();

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
		await expect(page.locator('h1')).toHaveText('the answer is 42');
	});

	test('loads', async ({ page }) => {
		await page.goto('/load');
		await expect(page.locator('h1')).toHaveText('bar == bar?');
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
				'{"status":200,"statusText":"","headers":{"content-type":"application/json"},"body":"{\\"answer\\":42}"}';

			expect(script_contents).toBe(payload);
		}

		expect(requests.some((r) => r.endsWith('/load/serialization.json'))).toBe(false);
	});

	test('POST fetches are serialized', async ({ page, javaScriptEnabled }) => {
		/** @type {string[]} */
		const requests = [];
		page.on('request', (r) => requests.push(r.url()));

		await page.goto('/load/serialization-post');

		await expect(page.locator('h1')).toHaveText('a: X');
		await expect(page.locator('h2')).toHaveText('b: Y');

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
		await expect(page.locator('h1')).toHaveText('42');
	});

	test('prefers static data over endpoint', async ({ page }) => {
		await page.goto('/load/foo');
		await expect(page.locator('h1')).toHaveText('static file');
	});

	test('data is inherited', async ({ page, javaScriptEnabled, app }) => {
		await page.goto('/load/parent/a/b/c');
		await expect(page.locator('h1')).toHaveText('message: original + new');
		await expect(page.locator('pre')).toHaveText(
			JSON.stringify({
				foo: { bar: 'Custom layout' },
				message: 'original + new',
				x: 'a',
				y: 'b',
				z: 'c'
			})
		);

		if (javaScriptEnabled) {
			await app.goto('/load/parent/d/e/f');

			await expect(page.locator('h1')).toHaveText('message: original + new');
			await expect(page.locator('pre')).toHaveText(
				JSON.stringify({
					foo: { bar: 'Custom layout' },
					message: 'original + new',
					x: 'd',
					y: 'e',
					z: 'f'
				})
			);
		}
	});

	test('fetch accepts a Request object', async ({ page, clicknav }) => {
		await page.goto('/load');
		await clicknav('[href="/load/fetch-request"]');
		await expect(page.locator('h1')).toHaveText('the answer is 42');
	});

	test('fetch resolves urls relatively to the target page', async ({ page, clicknav }) => {
		await page.goto('/load');
		await clicknav('[href="/load/fetch-relative"]');
		await expect(page.locator('h1')).toHaveText('the answer is 42');
		await expect(page.locator('h2')).toHaveText('the question was ?');
	});

	test('handles large responses', async ({ page }) => {
		await page.goto('/load');

		await page.goto('/load/large-response');
		await expect(page.locator('h1')).toHaveText('text.length is 5000000');
	});

	test('handles external api', async ({ page }) => {
		/** @type {string[]} */
		const requested_urls = [];

		const { port, close } = await start_server(async (req, res) => {
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

		try {
			await page.goto(`/load/server-fetch-request?port=${port}`);

			expect(requested_urls).toEqual(['/server-fetch-request-modified.json']);
			await expect(page.locator('h1')).toHaveText('the answer is 42');
		} finally {
			await close();
		}
	});

	test('makes credentialed fetches to endpoints by default', async ({ page, clicknav }) => {
		await page.goto('/load');
		await clicknav('[href="/load/fetch-credentialed"]');
		await expect(page.locator('h1')).toHaveText('Hello SvelteKit!');
	});

	test('includes correct page request headers', async ({
		baseURL,
		page,
		clicknav,
		javaScriptEnabled,
		browserName
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
			'sec-fetch-dest':
				browserName === 'webkit' ? undefined : javaScriptEnabled ? 'empty' : 'document',
			'sec-fetch-mode':
				browserName === 'webkit' ? undefined : javaScriptEnabled ? 'cors' : 'navigate',
			connection: javaScriptEnabled ? 'keep-alive' : undefined
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
		await expect(page.locator('p')).toHaveText('Data: null');
		await clicknav('[href="/load/props/"]');
		await expect(page.locator('p')).toHaveText('Data: Hello from Index!');
		await clicknav('[href="/load/props/about"]');
		await expect(page.locator('p')).toHaveText('Data: null');
	});

	test('server-side fetch respects set-cookie header', async ({ page, context }) => {
		await context.clearCookies();

		await page.goto('/load/set-cookie-fetch');
		await expect(page.locator('h1')).toHaveText('the answer is 42');

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
});

test.describe('Method overrides', () => {
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

test.describe('Nested layouts', () => {
	test('renders a nested layout', async ({ page }) => {
		await page.goto('/nested-layout');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		await expect(page.locator('p')).toHaveText('This is a nested layout component');
		await expect(page.locator('h1')).toHaveText('Hello from inside the nested layout component');
	});

	test('renders errors in the right layout', async ({ page }) => {
		await page.goto('/nested-layout/error');

		await expect(page.locator('footer')).toHaveText('Custom layout');
		expect(await page.evaluate(() => document.querySelector('p#nested'))).toBe(null);
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Error"'
		);
		await expect(page.locator('h1')).toHaveText('500');
	});

	test('renders errors in the right layout after client navigation', async ({ page, clicknav }) => {
		await page.goto('/nested-layout/');
		await clicknav('[href="/nested-layout/error"]');
		await expect(page.locator('footer')).toHaveText('Custom layout');
		expect(await page.evaluate(() => document.querySelector('p#nested'))).toBe(null);
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Error"'
		);
		await expect(page.locator('h1')).toHaveText('500');
	});

	test('renders deeply-nested errors in the right layout', async ({ page }) => {
		await page.goto('/nested-layout/foo/bar/nope');
		await expect(page.locator('footer')).toHaveText('Custom layout');
		expect(await page.evaluate(() => document.querySelector('p#nested'))).toBeTruthy();
		expect(await page.evaluate(() => document.querySelector('p#nested-foo'))).toBeTruthy();
		expect(await page.evaluate(() => document.querySelector('p#nested-bar'))).toBeTruthy();
		await expect(page.locator('#nested-error-message')).toHaveText('error.message: nope');
	});

	test('resets layout', async ({ page }) => {
		await page.goto('/nested-layout/reset');

		expect(await page.evaluate(() => document.querySelector('footer'))).toBe(null);
		expect(await page.evaluate(() => document.querySelector('p'))).toBe(null);
		await expect(page.locator('h1')).toHaveText('Layout reset');
		await expect(page.locator('h2')).toHaveText('Hello');
	});

	test('renders the closest error page', async ({ page, clicknav }) => {
		await page.goto('/errors/nested-error-page');

		await clicknav('[href="/errors/nested-error-page/nope"]');

		await expect(page.locator('h1')).toHaveText('Nested error page');
		await expect(page.locator('#nested-error-status')).toHaveText('status: 500');
		await expect(page.locator('#nested-error-message')).toHaveText('error.message: nope');
	});
});

test.describe('Page options', () => {
	test('does not hydrate page with hydrate=false', async ({ page, javaScriptEnabled }) => {
		await page.goto('/no-hydrate');

		await page.click('button');
		await expect(page.locator('button')).toHaveText('clicks: 0');

		if (javaScriptEnabled) {
			await Promise.all([page.waitForNavigation(), page.click('[href="/no-hydrate/other"]')]);
			await Promise.all([page.waitForNavigation(), page.click('[href="/no-hydrate"]')]);

			await page.click('button');
			await expect(page.locator('button')).toHaveText('clicks: 1');
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
			await expect(page.locator('h1')).toHaveText('look ma no javascript');
			expect(
				await page.evaluate(() => document.querySelectorAll('link[rel="modulepreload"]').length)
			).toBe(0);
		}
	});

	test('transformPageChunk can change the html output', async ({ page }) => {
		await page.goto('/transform-page-chunk');
		expect(await page.getAttribute('meta[name="transform-page"]', 'content')).toBe('Worked!');
	});

	test('does not SSR page with ssr=false', async ({ page, javaScriptEnabled }) => {
		await page.goto('/no-ssr');

		if (javaScriptEnabled) {
			await expect(page.locator('h1')).toHaveText('content was rendered');
		} else {
			expect(await page.evaluate(() => document.querySelector('h1'))).toBe(null);
			expect(await page.evaluate(() => document.querySelector('style[data-sveltekit]'))).toBe(null);
		}
	});

	test('does not SSR error page for 404s with ssr=false', async ({ request }) => {
		const html = await request.get('/no-ssr/missing');
		expect(await html.text()).not.toContain('load function was called erroneously');
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
		await expect(page.locator('h1')).toHaveText(/** @type {string} */ (baseURL));
	});

	test('page store functions as expected', async ({ page, clicknav, javaScriptEnabled }) => {
		await page.goto('/store');

		await expect(page.locator('h1')).toHaveText('Test');
		await expect(page.locator('h2')).toHaveText('Calls: 1');

		await clicknav('a[href="/store/result"]');
		await expect(page.locator('h1')).toHaveText('Result');
		await expect(page.locator('h2')).toHaveText(javaScriptEnabled ? 'Calls: 1' : 'Calls: 0');

		const oops = await page.evaluate(() => window.oops);
		expect(oops).toBeUndefined();
	});

	test('page store contains data', async ({ page, clicknav }) => {
		await page.goto('/store/data/www');

		const foo = { bar: 'Custom layout' };

		await expect(page.locator('#store-data')).toHaveText(
			JSON.stringify({ foo, name: 'SvelteKit', value: 456, page: 'www' })
		);

		await clicknav('a[href="/store/data/zzz"]');
		await expect(page.locator('#store-data')).toHaveText(
			JSON.stringify({ foo, name: 'SvelteKit', value: 456, page: 'zzz' })
		);

		await clicknav('a[href="/store/data/xxx"]');
		await expect(page.locator('#store-data')).toHaveText(
			JSON.stringify({ foo, name: 'SvelteKit', value: 123 })
		);
		await expect(page.locator('#store-error')).toHaveText('Params = xxx');

		await clicknav('a[href="/store/data/yyy"]');
		await expect(page.locator('#store-data')).toHaveText(
			JSON.stringify({ foo, name: 'SvelteKit', value: 123 })
		);
		await expect(page.locator('#store-error')).toHaveText('Params = yyy');
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

	test('navigating store contains from and to', async ({ app, page, javaScriptEnabled }) => {
		await page.goto('/store/navigating/a');

		await expect(page.locator('#nav-status')).toHaveText('not currently navigating');

		if (javaScriptEnabled) {
			await app.prefetchRoutes(['/store/navigating/b']);

			const res = await Promise.all([
				page.click('a[href="/store/navigating/b"]'),
				page.textContent('#navigating')
			]);

			expect(res[1]).toBe('navigating from /store/navigating/a to /store/navigating/b');

			await page.waitForSelector('#not-navigating');
			await expect(page.locator('#nav-status')).toHaveText('not currently navigating');
		}
	});

	test('navigating store clears after aborted navigation', async ({ page, javaScriptEnabled }) => {
		await page.goto('/store/navigating/a');

		await expect(page.locator('#nav-status')).toHaveText('not currently navigating');

		if (javaScriptEnabled) {
			await page.click('a[href="/store/navigating/c"]');
			await page.waitForTimeout(100); // gross, but necessary since no navigation occurs
			await page.click('a[href="/store/navigating/a"]');

			await page.waitForSelector('#not-navigating', { timeout: 500 });
			await expect(page.locator('#nav-status')).toHaveText('not currently navigating');
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

			await expect(page.locator('#one')).toHaveText(json);
			await expect(page.locator('#two')).toHaveText(json);
		});
	});

	test('updates page on client-side nav', async ({ page, clicknav }) => {
		await page.goto('/query/echo?foo=1');

		await clicknav('[href="/query/echo?bar=2"]');

		const json = JSON.stringify({ bar: ['2'] });

		await expect(page.locator('#one')).toHaveText(json);
		await expect(page.locator('#two')).toHaveText(json);
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

		await page.click('[href="/redirect/loopy/a"]');

		if (javaScriptEnabled) {
			await page.waitForSelector('#message');
			expect(page.url()).toBe(`${baseURL}/redirect/loopy/a`);
			await expect(page.locator('h1')).toHaveText('500');
			await expect(page.locator('#message')).toHaveText(
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

		expect(page.url()).toBe(`${baseURL}/redirect/missing-status/a`);
		await expect(page.locator('h1')).toHaveText('500');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Invalid status code"'
		);

		if (!javaScriptEnabled) {
			// handleError is not invoked for client-side navigation
			const lines = read_errors('/redirect/missing-status/a').split('\n');
			expect(lines[0]).toBe('Error: Invalid status code');
		}
	});

	test('errors on invalid status', async ({ baseURL, page, clicknav }) => {
		await page.goto('/redirect');

		await clicknav('[href="/redirect/missing-status/b"]');

		expect(page.url()).toBe(`${baseURL}/redirect/missing-status/b`);
		await expect(page.locator('h1')).toHaveText('500');
		await expect(page.locator('#message')).toHaveText(
			'This is your custom error page saying: "Invalid status code"'
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
		await page.click('[href="/routing/ambiguous/ok.json"]');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('body')).toHaveText('ok');
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

	test('back button returns to previous route when previous route has been navigated to via hash anchor', async ({
		page,
		clicknav
	}) => {
		await page.goto('/routing/hashes/a');

		await page.click('[href="#hash-target"]');
		await clicknav('[href="/routing/hashes/b"]');

		await page.goBack();
		await expect(page.locator('h1')).toHaveText('a');
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
		await expect(page.locator('h1')).toHaveText('x');
		await expect(page.locator('h2')).toHaveText('y-z');
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
		await expect(page.locator('h1')).toHaveText(/^$/);
		await expect(page.locator('h2')).toHaveText(/^$/);

		await clicknav('[href="/routing/rest/xyz/abc/deep"]');
		await expect(page.locator('h1')).toHaveText('xyz/abc');
		await expect(page.locator('h2')).toHaveText('xyz/abc');

		await page.click('[href="/routing/rest/xyz/abc/qwe/deep.json"]');
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

	test('exposes page.routeId', async ({ page, clicknav }) => {
		await page.goto('/routing/route-id');
		await clicknav('[href="/routing/route-id/foo"]');

		await expect(page.locator('h1')).toHaveText('routeId in load: routing/route-id/[x]');
		await expect(page.locator('h2')).toHaveText('routeId in store: routing/route-id/[x]');
	});

	test('serves a page that clashes with a root directory', async ({ page }) => {
		await page.goto('/static');
		await expect(page.locator('h1')).toHaveText('hello');
	});
});

test.describe('Session', () => {
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

test.describe('Matchers', () => {
	test('Matches parameters', async ({ page, clicknav }) => {
		await page.goto('/routing/matched');

		await clicknav('[href="/routing/matched/a"]');
		await expect(page.locator('h1')).toHaveText('lowercase: a');

		await clicknav('[href="/routing/matched/B"]');
		await expect(page.locator('h1')).toHaveText('uppercase: B');

		await clicknav('[href="/routing/matched/1"]');
		await expect(page.locator('h1')).toHaveText('number: 1');

		await clicknav('[href="/routing/matched/everything-else"]');
		await expect(page.locator('h1')).toHaveText('fallback: everything-else');
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

		await expect(page.locator('h1')).toHaveText(
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
		await expect(page.locator('h1')).toHaveText(
			'user.name is </script><script>window.pwned = 1</script>'
		);
	});
});
