import { expect } from '@playwright/test';
import { start_server, test } from '../../../utils.js';
import { createHash, randomBytes } from 'node:crypto';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('Caching', () => {
	test('caches pages', async ({ request }) => {
		const response = await request.get('/caching');
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});

	test('sets cache-control: private if page uses session in load and cache.private is unset', async ({
		request
	}) => {
		const response = await request.get('/caching/private/uses-session-in-load');
		expect(response.headers()['cache-control']).toBe('private, max-age=30');
	});

	test('sets cache-control: private if page uses session in init and cache.private is unset', async ({
		request
	}) => {
		const response = await request.get('/caching/private/uses-session-in-init');
		expect(response.headers()['cache-control']).toBe('private, max-age=30');
	});

	test('sets cache-control: private even if page doesnt use session but one exists and cache.private is unset', async ({
		request
	}) => {
		const response = await request.get('/caching/private/has-session');
		expect(response.headers()['cache-control']).toBe('private, max-age=30');
	});

	test('sets cache-control: private if page uses fetch and cache.private is unset', async ({
		request
	}) => {
		const response = await request.get('/caching/private/uses-fetch?credentials=include');
		expect(response.headers()['cache-control']).toBe('private, max-age=30');
	});

	test('sets cache-control: public if page uses fetch without credentials and cache.private is unset', async ({
		request
	}) => {
		const response = await request.get('/caching/private/uses-fetch?credentials=omit');
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});

	test('sets cache-control: private if cache.private is true', async ({ request }) => {
		const response = await request.get('/caching/private/uses-cache-private?private=true');
		expect(response.headers()['cache-control']).toBe('private, max-age=30');
	});

	test('sets cache-control: public if cache.private is false', async ({ request }) => {
		const response = await request.get('/caching/private/uses-cache-private?private=false');
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});

	test('sets cache-control: public if page uses session in load and cache.private is false', async ({
		request
	}) => {
		const response = await request.get('/caching/private/uses-session-in-load?private=false');
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});

	test('sets cache-control: public if page uses session in init and cache.private is false', async ({
		request
	}) => {
		const response = await request.get('/caching/private/uses-session-in-init?private=false');
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});

	test('sets cache-control: public if page has session and cache.private is false', async ({
		request
	}) => {
		const response = await request.get('/caching/private/has-session?private=false');
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});

	test('sets cache-control: public if page uses fetch and cache.private is false', async ({
		request
	}) => {
		const response = await request.get(
			'/caching/private/uses-fetch?credentials=include&private=false'
		);
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});

	test('sets cache-control: private if page uses fetch without credentials and cache.private is true', async ({
		request
	}) => {
		const response = await request.get('/caching/private/uses-fetch?credentials=omit&private=true');
		expect(response.headers()['cache-control']).toBe('private, max-age=30');
	});
});

test.describe('Content-Type', () => {
	test('sets Content-Type on page', async ({ request }) => {
		const response = await request.get('/content-type-header');
		expect(response.headers()['content-type']).toBe('text/html');
	});
});

test.describe('ETags', () => {
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

test.describe('Endpoints', () => {
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
		const { port, close } = await start_server((req, res) => {
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
			await close();
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

	test('Standalone endpoint is not accessible via /__data.json suffix', async ({ request }) => {
		const r1 = await request.get('/endpoint-output/simple', {
			headers: { accept: 'application/json' }
		});

		expect(await r1.json()).toEqual({ answer: 42 });

		const r2 = await request.get('/endpoint-output/simple/__data.json');
		expect(r2.status()).toBe(404);
	});

	test('body can be a binary ReadableStream', async ({ request }) => {
		const interruptedResponse = request.get('/endpoint-output/stream-throw-error');
		await expect(interruptedResponse).rejects.toThrow('socket hang up');

		const response = await request.get('/endpoint-output/stream');
		const body = await response.body();
		const digest = createHash('sha256').update(body).digest('base64url');
		expect(response.headers()['digest']).toEqual(`sha-256=${digest}`);
	});

	test('request body can be read slow', async ({ request }) => {
		const data = randomBytes(1024 * 256);
		const digest = createHash('sha256').update(data).digest('base64url');
		const response = await request.put('/endpoint-input/sha256', { data });
		expect(await response.text()).toEqual(digest);
	});
});

test.describe('Errors', () => {
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

	// TODO re-enable this if https://github.com/vitejs/vite/issues/7046 is implemented
	test.skip('error evaluating module', async ({ request }) => {
		const response = await request.get('/errors/init-error-endpoint');

		expect(response.status()).toBe(500);
		expect(await response.text()).toMatch('thisvariableisnotdefined is not defined');
	});

	test('page endpoint thrown error respects `accept: application/json`', async ({ request }) => {
		const response = await request.get('/errors/page-endpoint/get-implicit', {
			headers: {
				accept: 'application/json'
			}
		});

		const { message, name, stack, fancy } = await response.json();

		expect(response.status()).toBe(500);
		expect(name).toBe('FancyError');
		expect(message).toBe('oops');
		expect(fancy).toBe(true);

		if (process.env.DEV) {
			expect(stack.split('\n').length).toBeGreaterThan(1);
		} else {
			expect(stack.split('\n').length).toBe(1);
		}
	});

	test('page endpoint returned error respects `accept: application/json`', async ({ request }) => {
		const response = await request.get('/errors/page-endpoint/get-explicit', {
			headers: {
				accept: 'application/json'
			}
		});

		const { message, name, stack } = await response.json();

		expect(response.status()).toBe(400);
		expect(name).toBe('FancyError');
		expect(message).toBe('oops');

		if (process.env.DEV) {
			expect(stack.split('\n').length).toBeGreaterThan(1);
		} else {
			expect(stack.split('\n').length).toBe(1);
		}
	});

	test('returns 400 when accessing a malformed URI', async ({ page }) => {
		const response = await page.goto('/%c0%ae%c0%ae/etc/passwd');
		if (process.env.DEV) {
			// Vite will return a 500 error code
			// We mostly want to make sure malformed requests don't bring down the whole server
			expect(/** @type {Response} */ (response).status()).toBeGreaterThanOrEqual(400);
		} else {
			expect(/** @type {Response} */ (response).status()).toBe(400);
		}
	});
});

test.describe('Load', () => {
	test('fetching a non-existent resource in root layout fails without hanging', async ({
		request
	}) => {
		const response = await request.get('/errors/error-in-layout');
		expect(await response.text()).toContain('Error: 500');
	});
});

test.describe('Routing', () => {
	test('event.params are available in handle', async ({ request }) => {
		const response = await request.get('/routing/params-in-handle/banana');
		expect(await response.json()).toStrictEqual({
			key: 'routing/params-in-handle/[x]',
			params: { x: 'banana' }
		});
	});

	test('/favicon.ico is a valid route', async ({ request }) => {
		const response = await request.get('/favicon.ico');
		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toEqual({ surprise: 'lol' });
	});
});

test.describe('Shadowed pages', () => {
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
});

test.describe('Static files', () => {
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

	test('Vite serves assets in allowed directories', async ({ page, request }) => {
		await page.goto('/assets');
		const path = await page.textContent('h1');
		if (!path) throw new Error('Could not determine path');

		const r1 = await request.get(path);
		expect(r1.status()).toBe(200);
		expect(await r1.text()).toContain('http://www.w3.org/2000/svg');

		// check that we can fetch a route which overlaps with the name of a file
		const r2 = await request.get('/package.json');
		expect(r2.status()).toBe(200);
		expect(await r2.json()).toEqual({ works: true });
	});

	test('Filenames are case-sensitive', async ({ request }) => {
		const response = await request.get('/static.JSON');
		expect(response.status()).toBe(404);
	});

	test('Serves symlinked asset', async ({ request }) => {
		const response = await request.get('/symlink-from/hello.txt');
		expect(response.status()).toBe(200);
		expect(await response.text()).toBe('hello');
	});
});

test.describe('Miscellaneous', () => {
	test('does not serve version.json with an immutable cache header', async ({ request }) => {
		// this isn't actually a great test, because caching behaviour is down to adapters.
		// but it's better than nothing
		const response = await request.get('/_app/version.json');
		const headers = response.headers();
		expect(headers['cache-control'] || '').not.toContain('immutable');
	});
});
