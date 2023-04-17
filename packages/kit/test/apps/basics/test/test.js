import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(() => process.env.KIT_E2E_BROWSER === 'webkit');

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
			expect(sources[1]).toBe(`${baseURL}/_app/immutable/assets/large.3183867c.jpg`);
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
			const script_contents = await page.innerHTML(
				'script[data-sveltekit-fetched][data-url="/load/serialization/fetched-from-shared.json"]'
			);

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
				'script[data-sveltekit-fetched][data-url="/load/serialization-post.json"][data-hash="1vn6nlx"]'
			);
			const script_contents_b = await page.innerHTML(
				'script[data-sveltekit-fetched][data-url="/load/serialization-post.json"][data-hash="1vn6nlw"]'
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

	test('handles external api', async ({ page, start_server }) => {
		/** @type {string[]} */
		const requested_urls = [];

		const { port } = await start_server(async (req, res) => {
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

		await page.goto(`/load/server-fetch-request?port=${port}`);

		expect(requested_urls).toEqual(['/server-fetch-request-modified.json']);
		expect(await page.textContent('h1')).toBe('the answer is 42');
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
		javaScriptEnabled
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
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				connection: 'keep-alive'
			});
		} else {
			expect(headers).toEqual({
				accept: '*/*',
				'accept-language': 'en-US'
			});
		}
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

	test('Prerendered +server.js called from a non-prerendered +page.server.js works', async ({
		page,
		app,
		javaScriptEnabled
	}) => {
		if (javaScriptEnabled) {
			await page.goto('/');
			await app.goto('/prerendering/prerendered-endpoint/page');
		} else {
			await page.goto('/prerendering/prerendered-endpoint/page');
		}

		expect(await page.textContent('h1')).toBe(
			'Im prerendered and called from a non-prerendered +page.server.js'
		);
	});

	test('Prerendered +server.js called from a non-prerendered handle hook works', async ({
		page,
		javaScriptEnabled
	}) => {
		if (javaScriptEnabled) {
			await page.goto('/prerendering/prerendered-endpoint');
			await page.click('a', { noWaitAfter: true });
		} else {
			await page.goto('/prerendering/prerendered-endpoint/from-handle-hook');
		}

		expect(await page.textContent('html')).toBe(
			'{"message":"Im prerendered and called from a non-prerendered +page.server.js"}'
		);
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

		await page.goto('/paths/deeply/nested');

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
		await page.locator('input[name="username"]').fill('foo');
		await page.locator('input[name="password"]').fill('bar');
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

		await page.locator('input[name="username"]').fill('foo');
		await page.locator('button[formenctype="multipart/form-data"]').click();

		await expect(page.locator('pre')).toHaveText(JSON.stringify({ result: 'foo' }));
	});

	test('Success data as form-urlencoded is returned', async ({ page }) => {
		await page.goto('/actions/success-data');

		expect(await page.textContent('pre')).toBe(JSON.stringify(null));

		await page.locator('input[name="username"]').fill('bar');
		await page.locator('button[formenctype="application/x-www-form-urlencoded"]').click();

		await expect(page.locator('pre')).toHaveText(JSON.stringify({ result: 'bar' }));
	});

	test('applyAction updates form prop', async ({ page, javaScriptEnabled }) => {
		await page.goto('/actions/update-form');
		expect(await page.textContent('pre')).toBe(JSON.stringify(null));

		if (javaScriptEnabled) {
			await page.locator('button.increment-success').click();
			await expect(page.locator('pre')).toHaveText(JSON.stringify({ count: 0 }));

			await page.locator('button.increment-invalid').click();
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
			await page.locator('button.increment-success').click();
			await expect(page.locator('pre')).toHaveText(JSON.stringify({ count: 0 }));

			await page.locator('button.invalidateAll').click();
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
			await page.locator('button.redirect').click();
			await expect(page.locator('footer')).toHaveText('Custom layout');
		}
	});

	test('applyAction errors', async ({ page, javaScriptEnabled }) => {
		await page.goto('/actions/update-form');
		expect(await page.textContent('pre')).toBe(JSON.stringify(null));

		if (javaScriptEnabled) {
			await page.locator('button.error').click();
			await expect(page.locator('p')).toHaveText(
				'This is your custom error page saying: "Unexpected Form Error"'
			);
		}
	});

	test('use:enhance', async ({ page }) => {
		await page.goto('/actions/enhance');

		expect(await page.textContent('pre.formdata1')).toBe(JSON.stringify(null));
		expect(await page.textContent('pre.formdata2')).toBe(JSON.stringify(null));

		await page.locator('input[name="username"]').fill('foo');
		await page.locator('button.form1').click();

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

	test('use:enhance button with formAction', async ({ page }) => {
		await page.goto('/actions/enhance');

		expect(await page.textContent('pre.formdata1')).toBe(JSON.stringify(null));

		await page.locator('input[name="username"]').fill('foo');
		await page.locator('button.form1-register').click();

		await expect(page.locator('pre.formdata1')).toHaveText(
			JSON.stringify({ result: 'register: foo' })
		);
	});

	test('use:enhance button with name', async ({ page }) => {
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

	test('use:enhance does not clear form on second submit', async ({ page }) => {
		await page.goto('/actions/enhance');

		await page.locator('input[name="message"]').fill('hello');

		await page.locator('.form3').click();
		await expect(page.locator('pre.formdata1')).toHaveText(JSON.stringify({ message: 'hello' }));
		await expect(page.locator('pre.formdata2')).toHaveText(JSON.stringify({ message: 'hello' }));

		await page.locator('.form3').click();
		await page.waitForTimeout(0); // wait for next tick
		await expect(page.locator('pre.formdata1')).toHaveText(JSON.stringify({ message: 'hello' }));
		await expect(page.locator('pre.formdata2')).toHaveText(JSON.stringify({ message: 'hello' }));
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

	test('redirect in handle', async ({ page, javaScriptEnabled }) => {
		await page.goto('/actions/redirect-in-handle');

		page.click('button');

		const [redirect] = await Promise.all([
			page.waitForResponse('/actions/redirect-in-handle'),
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
	// set a `Secure` cookie on that. So we don't run these cross-platform

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

		await page.locator('button#teapot').click();
		await expect(page.locator('#cookie-value')).toHaveText('teapot');

		// setting a different value...
		await page.locator('button#janeAusten').click();
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
