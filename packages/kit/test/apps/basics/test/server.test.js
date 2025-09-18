/** @import { ReadableSpan } from '@opentelemetry/sdk-trace-node' */
import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('Caching', () => {
	test('caches pages', async ({ request }) => {
		const response = await request.get('/caching');
		expect(response.headers()['cache-control']).toBe('public, max-age=30');
	});
});

test.describe('Content-Type', () => {
	test('sets Content-Type on page', async ({ request }) => {
		const response = await request.get('/content-type-header');
		expect(response.headers()['content-type']).toBe('text/html');
	});
});

test.describe('Content-Length', () => {
	test('sets Content-Length on page', async ({ request }) => {
		const response = await request.get('/content-length-header');

		// TODO this would ideally be a unit test of `Server`,
		// as would most of the tests in this file
		if (!response.headers()['content-encoding']) {
			expect(+response.headers()['content-length']).toBeGreaterThan(1000);
		}
	});
});

test.describe('Cookies', () => {
	test('does not forward cookies from external domains', async ({ request, start_server }) => {
		const { port } = await start_server(async (req, res) => {
			if (req.url === '/') {
				res.writeHead(200, {
					'set-cookie': 'external=true',
					'access-control-allow-origin': '*'
				});

				res.end('ok');
			} else {
				res.writeHead(404);
				res.end('not found');
			}
		});

		const response = await request.get(`/load/fetch-external-no-cookies?port=${port}`);
		expect(response.headers()['set-cookie']).not.toContain('external=true');
	});
});

test.describe('CSRF', () => {
	if (process.env.DEV) {
		return;
	}

	test('Blocks requests with incorrect origin', async ({ baseURL }) => {
		const content_types = [
			'application/x-www-form-urlencoded',
			'multipart/form-data',
			'text/plain',
			'text/plaiN'
		];
		const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
		for (const method of methods) {
			for (const content_type of content_types) {
				const res = await fetch(`${baseURL}/csrf`, {
					method,
					headers: {
						'content-type': content_type
					}
				});
				const message = `request method: ${method}, content-type: ${content_type}`;
				expect(res.status, message).toBe(403);
				expect(await res.text(), message).toBe(
					`Cross-site ${method} form submissions are forbidden`
				);
			}
		}
	});

	test('Allows requests from same origin', async ({ baseURL }) => {
		const url = new URL(baseURL);
		const res = await fetch(`${baseURL}/csrf`, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: url.origin
			}
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('ok');
	});

	test('Allows requests from allowed origins', async ({ baseURL }) => {
		// Test with trusted.example.com which is in trustedOrigins
		const res1 = await fetch(`${baseURL}/csrf`, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://trusted.example.com'
			}
		});
		expect(res1.status).toBe(200);
		expect(await res1.text()).toBe('ok');

		// Test with payment-gateway.test which is also in trustedOrigins
		const res2 = await fetch(`${baseURL}/csrf`, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://payment-gateway.test'
			}
		});
		expect(res2.status).toBe(200);
		expect(await res2.text()).toBe('ok');
	});

	test('Blocks requests from non-allowed origins', async ({ baseURL }) => {
		// Test with origin not in trustedOrigins list
		const res1 = await fetch(`${baseURL}/csrf`, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://malicious-site.com'
			}
		});
		expect(res1.status).toBe(403);
		expect(await res1.text()).toBe('Cross-site POST form submissions are forbidden');

		// Test with similar but not exact origin
		const res2 = await fetch(`${baseURL}/csrf`, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://trusted.example.com.evil.com'
			}
		});
		expect(res2.status).toBe(403);
		expect(await res2.text()).toBe('Cross-site POST form submissions are forbidden');

		// Test subdomain attack (should be blocked)
		const res3 = await fetch(`${baseURL}/csrf`, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://evil.trusted.example.com'
			}
		});
		expect(res3.status).toBe(403);
		expect(await res3.text()).toBe('Cross-site POST form submissions are forbidden');
	});

	test('Allows GET requests regardless of origin', async ({ baseURL }) => {
		const res = await fetch(`${baseURL}/csrf`, {
			method: 'GET',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://any-origin.com'
			}
		});
		expect(res.status).toBe(200);
	});

	test('Allows non-form content types regardless of origin', async ({ baseURL }) => {
		const res = await fetch(`${baseURL}/csrf`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				origin: 'https://any-origin.com'
			}
		});
		expect(res.status).toBe(200);
	});

	test('Allows all protected HTTP methods from allowed origins', async ({ baseURL }) => {
		const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
		for (const method of methods) {
			const res = await fetch(`${baseURL}/csrf`, {
				method,
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					origin: 'https://trusted.example.com'
				}
			});
			expect(res.status, `Method ${method} should be allowed from trusted origin`).toBe(200);
			expect(await res.text(), `Method ${method} should return ok`).toBe('ok');
		}
	});

	test('Handles undefined origin correctly', async ({ baseURL }) => {
		// Some requests may have null origin (e.g., from certain mobile apps)
		const res = await fetch(`${baseURL}/csrf`, {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			}
		});
		expect(res.status).toBe(403);
		expect(await res.text()).toBe('Cross-site POST form submissions are forbidden');
	});
});

test.describe('Endpoints', () => {
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

	test('Prerendered +server.js called from a non-prerendered +server.js works', async ({
		baseURL
	}) => {
		const res = await fetch(`${baseURL}/prerendering/prerendered-endpoint/proxy`);

		expect(res.status).toBe(200);
		expect(await res.json()).toStrictEqual({
			message: 'Im prerendered and called from a non-prerendered +page.server.js'
		});
	});

	test('Partially Prerendered +server.js called from a non-prerendered +server.js works', async ({
		baseURL
	}) => {
		for (const [description, url] of [
			['direct', `${baseURL}/prerendering/prerendered-endpoint/api-with-param/prerendered`],
			[
				'proxied',
				`${baseURL}/prerendering/prerendered-endpoint/proxy?api-with-param-option=prerendered`
			]
		]) {
			await test.step(description, async () => {
				const res = await fetch(url);

				expect(res.status).toBe(200);
				expect(await res.json()).toStrictEqual({
					message: 'Im prerendered and called from a non-prerendered +page.server.js'
				});
			});
		}
	});

	test('invalid request method returns allow header', async ({ request }) => {
		const response = await request.post('/endpoint-output/body');

		expect(response.status()).toBe(405);

		const allow_header = response.headers()['allow'];
		expect(allow_header).toMatch(/\bGET\b/);
		expect(allow_header).toMatch(/\bHEAD\b/);
	});

	// TODO all the remaining tests in this section are really only testing
	// setResponse, since we're not otherwise changing anything on the response.
	// might be worth making these unit tests instead
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

	// TODO see above
	test('body can be a binary ReadableStream', async ({ request }) => {
		const interruptedResponse = request.get('/endpoint-output/stream-throw-error');
		await expect(interruptedResponse).rejects.toThrow('socket hang up');

		const response = await request.get('/endpoint-output/stream');
		const body = await response.body();
		const digest = createHash('sha256').update(body).digest('base64url');
		expect(response.headers()['digest']).toEqual(`sha-256=${digest}`);
	});

	// TODO see above
	test('stream can be canceled with TypeError', async ({ request }) => {
		const responseBefore = await request.get('/endpoint-output/stream-typeerror?what');
		expect(await responseBefore.text()).toEqual('null');

		const interruptedResponse = request.get('/endpoint-output/stream-typeerror');
		await expect(interruptedResponse).rejects.toThrow('socket hang up');

		const responseAfter = await request.get('/endpoint-output/stream-typeerror?what');
		expect(await responseAfter.text()).toEqual('TypeError');
	});

	// TODO see above
	test('request body can be read slow', async ({ request }) => {
		const data = randomBytes(1024 * 256);
		const digest = createHash('sha256').update(data).digest('base64url');
		const response = await request.put('/endpoint-input/sha256', { data });
		expect(await response.text()).toEqual(digest);
	});

	// TODO see above
	test('invalid headers return a 500', async ({ request }) => {
		const response = await request.get('/endpoint-output/head-write-error');
		expect(response.status()).toBe(500);
		expect(await response.text()).toMatch(
			'TypeError [ERR_INVALID_CHAR]: Invalid character in header content ["x-test"]'
		);
	});

	test('OPTIONS handler', async ({ request }) => {
		const url = '/endpoint-output';

		const response = await request.fetch(url, {
			method: 'OPTIONS'
		});

		expect(response.status()).toBe(200);
		expect(await response.text()).toBe('ok');
	});

	test('HEAD handler', async ({ request }) => {
		const url = '/endpoint-output/head-handler';

		const page_response = await request.fetch(url, {
			method: 'HEAD',
			headers: {
				accept: 'text/html'
			}
		});

		expect(page_response.status()).toBe(200);
		expect(await page_response.text()).toBe('');
		expect(page_response.headers()['x-sveltekit-page']).toBe('true');

		const endpoint_response = await request.fetch(url, {
			method: 'HEAD',
			headers: {
				accept: 'application/json'
			}
		});

		expect(endpoint_response.status()).toBe(200);
		expect(await endpoint_response.text()).toBe('');
		expect(endpoint_response.headers()['x-sveltekit-head-endpoint']).toBe('true');
	});

	test('catch-all handler', async ({ request }) => {
		const url = '/endpoint-output/fallback';

		let response = await request.fetch(url, {
			method: 'GET'
		});

		expect(response.status()).toBe(200);
		expect(await response.text()).toBe('ok');

		response = await request.fetch(url, {
			method: 'MOVE' // also works with arcane methods
		});

		expect(response.status()).toBe(200);
		expect(await response.text()).toBe('catch-all');

		response = await request.fetch(url, {
			method: 'OPTIONS'
		});

		expect(response.status()).toBe(200);
		expect(await response.text()).toBe('catch-all');
	});

	test('can get assets using absolute path', async ({ request }) => {
		const response = await request.get('/endpoint-output/fetch-asset/absolute');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toBe('text/plain');
		expect(await response.text()).toBe('Cos sie konczy, cos zaczyna');
	});

	test('can get assets using relative path', async ({ request }) => {
		const response = await request.get('/endpoint-output/fetch-asset/relative');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toBe('text/plain');
		expect(await response.text()).toBe('Cos sie konczy, cos zaczyna');
	});
});

test.describe('Errors', () => {
	test('invalid route response is handled', async ({ request }) => {
		const response = await request.get('/errors/invalid-route-response');

		expect(/** @type {import('@playwright/test').APIResponse} */ (response).status()).toBe(500);
		expect(await response.text()).toMatch(
			'Invalid response from route /errors/invalid-route-response: handler should return a Response object'
		);
	});

	test('unhandled http method', async ({ request }) => {
		const response = await request.put('/errors/invalid-route-response');

		expect(response.status()).toBe(405);
		expect(await response.text()).toMatch('PUT method not allowed');
	});

	test('error evaluating module', async ({ request }) => {
		const response = await request.get('/errors/init-error-endpoint');

		expect(response.status()).toBe(500);
		expect(await response.text()).toMatch('thisvariableisnotdefined is not defined');
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

	test('stack traces are not fixed twice', async ({ page }) => {
		await page.goto('/errors/stack-trace');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Cannot read properties of undefined (reading \'toUpperCase\') (500 Internal Error)"'
		);

		// check the stack wasn't mutated
		await page.goto('/errors/stack-trace');
		expect(await page.textContent('#message')).toBe(
			'This is your custom error page saying: "Cannot read properties of undefined (reading \'toUpperCase\') (500 Internal Error)"'
		);
	});

	test('error(...) in endpoint', async ({ request, read_errors }) => {
		// HTML
		{
			const res = await request.get('/errors/endpoint-throw-error', {
				headers: {
					accept: 'text/html'
				}
			});

			const error = read_errors('/errors/endpoint-throw-error');
			expect(error).toBe(undefined);

			expect(res.status()).toBe(401);
			expect(await res.text()).toContain(
				'This is the static error page with the following message: You shall not pass'
			);
		}

		// JSON (default)
		{
			const res = await request.get('/errors/endpoint-throw-error');

			const error = read_errors('/errors/endpoint-throw-error');
			expect(error).toBe(undefined);

			expect(res.status()).toBe(401);
			expect(await res.json()).toEqual({
				message: 'You shall not pass'
			});
		}
	});

	test('redirect(...) in endpoint', async ({ page, read_errors }) => {
		const res = await page.goto('/errors/endpoint-throw-redirect');
		expect(res?.status()).toBe(200); // redirects are opaque to the browser

		const error = read_errors('/errors/endpoint-throw-redirect');
		expect(error).toBe(undefined);

		expect(await page.textContent('h1')).toBe('the answer is 42');
	});

	test('POST to missing page endpoint', async ({ request }) => {
		const res = await request.post('/errors/missing-actions', {
			headers: {
				accept: 'text/html'
			}
		});
		expect(res?.status()).toBe(405);

		const res_json = await request.post('/errors/missing-actions', {
			headers: {
				accept: 'application/json'
			}
		});
		expect(res_json?.status()).toBe(405);
		expect(await res_json.json()).toEqual({
			type: 'error',
			error: {
				message: process.env.DEV
					? 'POST method not allowed. No form actions exist for the page at /errors/missing-actions (405 Method Not Allowed)'
					: 'POST method not allowed. No form actions exist for this page (405 Method Not Allowed)'
			}
		});
	});

	test('error thrown in handle results in a rendered error page or JSON response', async ({
		request
	}) => {
		// HTML
		{
			const res = await request.get('/errors/error-in-handle', {
				headers: {
					accept: 'text/html'
				}
			});

			expect(res.status()).toBe(500);
			expect(await res.text()).toContain(
				'This is the static error page with the following message: Error in handle'
			);
		}

		// JSON (default)
		{
			const res = await request.get('/errors/error-in-handle');

			const error = await res.json();

			expect(error.stack).toBe(undefined);
			expect(res.status()).toBe(500);
			expect(error).toEqual({
				message: 'Error in handle (500 Internal Error)'
			});
		}
	});

	test('expected error thrown in handle results in a rendered error page or JSON response', async ({
		request
	}) => {
		// HTML
		{
			const res = await request.get('/errors/expected-error-in-handle', {
				headers: {
					accept: 'text/html'
				}
			});

			expect(res.status()).toBe(500);
			expect(await res.text()).toContain(
				'This is the static error page with the following message: Expected error in handle'
			);
		}

		// JSON (default)
		{
			const res = await request.get('/errors/expected-error-in-handle');

			const error = await res.json();

			expect(error.stack).toBe(undefined);
			expect(res.status()).toBe(500);
			expect(error).toEqual({
				message: 'Expected error in handle'
			});
		}
	});

	test('error thrown from load on the server respects page options when rendering the error page', async ({
		request
	}) => {
		const res = await request.get('/errors/load-error-page-options/csr');
		expect(res.status()).toBe(500);
		const content = await res.text();
		expect(content).toContain('Crashing now');
		// the hydration script should not be present if the csr page option is respected
		expect(content).not.toContain('kit.start(app');
	});
});

test.describe('Load', () => {
	test('fetching a non-existent resource in root layout fails without hanging', async ({
		request
	}) => {
		const response = await request.get('/errors/error-in-layout');
		expect(await response.text()).toContain('Error: 404');
	});

	test('fetch does not load a file with a # character', async ({ request }) => {
		const response = await request.get('/load/static-file-with-hash');
		expect(await response.text()).toContain('status: 404');
	});

	test('fetch reads universal load assets on the server', async ({ page }) => {
		await page.goto('/load/fetch-asset');
		await expect(page.locator('p')).toHaveText('1');
	});

	test('includes origin header on non-GET internal request', async ({ page, baseURL }) => {
		await page.goto('/load/fetch-origin-internal');
		expect(await page.textContent('h1')).toBe(`origin: ${new URL(baseURL).origin}`);
	});

	test('includes origin header on external request', async ({ page, baseURL, start_server }) => {
		const { port } = await start_server((req, res) => {
			if (req.url === '/') {
				res.writeHead(200, {
					'content-type': 'application/json',
					'access-control-allow-origin': '*'
				});

				res.end(JSON.stringify({ origin: req.headers.origin }));
			} else {
				res.writeHead(404);
				res.end('not found');
			}
		});

		await page.goto(`/load/fetch-origin-external?port=${port}`);
		expect(await page.textContent('h1')).toBe(`origin: ${new URL(baseURL).origin}`);
	});

	test('does not run when using invalid request methods', async ({ request }) => {
		const load_url = '/load';

		let response = await request.fetch(load_url, {
			method: 'OPTIONS'
		});

		expect(response.status()).toBe(204);
		expect(await response.text()).toBe('');
		expect(response.headers()['allow']).toBe('GET, HEAD, OPTIONS');

		const actions_url = '/actions/enhance';
		response = await request.fetch(actions_url, {
			method: 'OPTIONS'
		});

		expect(response.status()).toBe(204);
		expect(await response.text()).toBe('');
		expect(response.headers()['allow']).toBe('GET, HEAD, OPTIONS, POST');
	});

	test('allows logging URL search params', async ({ page }) => {
		await page.goto('/load/server-log-search-param');

		expect(await page.textContent('p')).toBe('hello world');
	});
});

test.describe('Routing', () => {
	test('event.params are available in handle', async ({ request }) => {
		const response = await request.get('/routing/params-in-handle/banana');
		expect(await response.json()).toStrictEqual({
			key: '/routing/params-in-handle/[x]',
			params: { x: 'banana' }
		});
	});

	test('/favicon.ico is a valid route', async ({ request }) => {
		const response = await request.get('/favicon.ico');
		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toEqual({ surprise: 'lol' });
	});

	test('Vite trailing slash redirect for prerendered pages retains URL query string', async ({
		request
	}) => {
		if (process.env.DEV) return;

		let response = await request.get('/routing/prerendered/trailing-slash/always?a=1');
		expect(new URL(response.url()).search).toBe('?a=1');

		response = await request.get('/routing/prerendered/trailing-slash/never/?a=1');
		expect(new URL(response.url()).search).toBe('?a=1');

		response = await request.get('/routing/prerendered/trailing-slash/ignore/?a=1');
		expect(new URL(response.url()).search).toBe('?a=1');
	});
});

test.describe('Shadowed pages', () => {
	test('Action can return undefined', async ({ baseURL, request }) => {
		const response = await request.post('/shadowed/simple/post', {
			form: {},
			headers: {
				accept: 'application/json',
				origin: new URL(baseURL).origin
			}
		});

		expect(response.status()).toBe(200);
		expect(await response.json()).toEqual({ data: '-1', type: 'success', status: 204 });
	});
});

test.describe('Static files', () => {
	test('static files', async ({ request }) => {
		let response = await request.get('/static.json');
		expect(await response.json()).toBe('static file');

		response = await request.get('/subdirectory/static.json');
		expect(await response.json()).toBe('subdirectory file');

		expect(response.headers()['access-control-allow-origin']).toBe('*');

		response = await request.get('/favicon.ico');
		expect(response.status()).toBe(200);
	});

	test('does not use Vite to serve contents of static directory', async ({ request }) => {
		const response = await request.get('/static/static.json');
		expect(response.status()).toBe(process.env.DEV ? 403 : 404);
	});

	test('Vite serves assets in allowed directories', async ({ page, request }) => {
		await page.goto('/asset-import');
		const path = await page.getAttribute('img[alt=potatoes]', 'src');
		if (!path) throw new Error('Could not determine path');

		const r1 = await request.get(path);
		expect(r1.status()).toBe(200);
		expect(await r1.text()).toBeTruthy();

		// check that we can fetch a route which overlaps with the name of a file
		const r2 = await request.get('/package.json');
		expect(r2.status()).toBe(200);
		expect(await r2.json()).toEqual({ works: true });
	});

	if (process.platform !== 'win32') {
		test('Serves symlinked asset', async ({ request }) => {
			const response = await request.get('/symlink-from/hello.txt');
			expect(response.status()).toBe(200);
			expect(await response.text()).toBe('hello');
		});
	}
});

test.describe('setHeaders', () => {
	test('allows multiple set-cookie headers with different values', async ({ page }) => {
		const response = await page.goto('/headers/set-cookie/sub');
		const cookies = response ? (await response.allHeaders())['set-cookie'] : '';

		expect(cookies).toMatch('cookie1=value1');
		expect(cookies).toMatch('cookie2=value2');
	});
});

test.describe('cookies', () => {
	test('cookie.serialize created correct cookie header string', async ({ page }) => {
		const response = await page.goto('/cookies/serialize');
		const cookies = response ? await response.headerValue('set-cookie') : '';

		expect(cookies).toMatch('before=before');
		expect(cookies).toMatch('after=after');
		expect(cookies).toMatch('endpoint=endpoint');
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

	test('handles responses with immutable headers', async ({ request }) => {
		const response = await request.get('/immutable-headers');
		expect(response.status()).toBe(200);
		expect(await response.text()).toBe('foo');
	});

	test('serves prerendered non-latin pages', async ({ request }) => {
		const response = await request.get('/prerendering/中文');
		expect(response.status()).toBe(200);
	});
});

test.describe('reroute', () => {
	test('Apply reroute when directly accessing a page', async ({ page }) => {
		await page.goto('/reroute/basic/a');
		expect(await page.textContent('h1')).toContain(
			'Successfully rewritten, URL should still show a: /reroute/basic/a'
		);
	});

	test('Apply async reroute when directly accessing a page', async ({ page }) => {
		page
			.context()
			.addCookies([{ name: 'reroute-cookie', value: 'yes', path: '/', domain: 'localhost' }]);
		await page.goto('/reroute/async/a');
		expect(await page.textContent('h1')).toContain(
			'Successfully rewritten, URL should still show a: /reroute/async/a'
		);
	});

	test('Apply async prerendered reroute when directly accessing a page', async ({ page }) => {
		await page.goto('/reroute/async/c');
		expect(await page.textContent('h1')).toContain(
			'Successfully rewritten, URL should still show a: /reroute/async/c'
		);
	});

	test('Apply reroute to prerendered page when directly accessing a page', async ({ page }) => {
		await page.goto('/reroute/prerendered/to-destination');
		expect(await page.textContent('h1')).toContain('reroute that points to prerendered page works');
	});

	test('Returns a 500 response if reroute throws an error on the server', async ({ page }) => {
		const response = await page.goto('/reroute/error-handling/server-error');
		expect(response?.status()).toBe(500);
	});
});

test.describe('init', () => {
	test('init server hook is called once before the load function', async ({ page }) => {
		await page.goto('/init-hooks');
		await expect(page.locator('p')).toHaveText('1');
		await page.reload();
		await expect(page.locator('p')).toHaveText('1');
	});
});

test.describe('getRequestEvent', () => {
	test('getRequestEvent works in server endpoints', async ({ request }) => {
		const response = await request.get('/get-request-event/endpoint');
		expect(await response.text()).toBe('hello from hooks.server.js');
	});
});

test.describe('$app/forms', () => {
	test('deserialize works on the server', async ({ request }) => {
		const response = await request.get('/serialization-form-non-enhanced/server-deserialize');
		expect(await response.json()).toEqual({ data: 'It works!' });
	});
});

const root = path.resolve(fileURLToPath(import.meta.url), '..', '..');

test.describe('$app/environment', () => {
	test('treeshakes dev check', async () => {
		test.skip(!!process.env.DEV, 'skip when in dev mode');

		const code = fs.readFileSync(
			path.join(root, '.svelte-kit/output/server/entries/pages/treeshaking/dev/_page.svelte.js'),
			'utf-8'
		);
		// check that import { dev } from '$app/environment' is treeshaken
		expect(code).not.toContain('dev');
	});

	test('treeshakes browser check', async () => {
		test.skip(!!process.env.DEV, 'skip when in dev mode');

		const code = fs.readFileSync(
			path.join(
				root,
				'.svelte-kit/output/server/entries/pages/treeshaking/browser/_page.svelte.js'
			),
			'utf-8'
		);
		// check that import { browser } from '$app/environment' is treeshaken
		expect(code).not.toContain('browser');
	});
});

test.describe('tracing', () => {
	// Helper function to find the resolve.root span deep in the handle.child chain
	/**
	 * @param {ReadableSpan} span
	 * @returns {ReadableSpan | null}
	 */
	function find_resolve_root_span(span) {
		if (span.name === 'sveltekit.resolve') {
			return span;
		}
		for (const child of span.children || []) {
			const found = find_resolve_root_span(child);
			if (found) return found;
		}
		return null;
	}

	function rand() {
		// node 18 doesn't have crypto.randomUUID() and we run tests in node 18
		return Math.random().toString(36).substring(2, 15);
	}

	test('correct spans are created for a regular navigation', async ({ page, read_traces }) => {
		const test_id = rand();
		await page.goto(`/tracing/one/two/three/four/five?test_id=${test_id}`);
		const traces = read_traces(test_id);
		expect(traces.length).toBeGreaterThan(0);

		const trace = traces[0];
		const trace_id = trace.trace_id;

		// Verify root span structure
		expect(trace).toEqual({
			name: 'sveltekit.handle.root',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/one/two/three/[...four]',
				'http.method': 'GET',
				'http.url': expect.stringContaining(`/tracing/one/two/three/four/five?test_id=${test_id}`),
				'sveltekit.is_data_request': false,
				'sveltekit.is_sub_request': false,
				test_id
			},
			links: [],
			trace_id,
			span_id: expect.any(String),
			children: expect.arrayContaining([
				expect.objectContaining({
					name: 'sveltekit.handle.sequenced.set_tracing_test_id',
					attributes: {}
				})
			])
		});

		// Find and verify the resolve.root span
		const resolve_root_span = find_resolve_root_span(trace);
		expect(resolve_root_span).not.toBeNull();
		expect(resolve_root_span).toEqual({
			name: 'sveltekit.resolve',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/one/two/three/[...four]',
				'http.response.status_code': 200,
				'http.response.body.size': expect.stringMatching(/^\d+$/)
			},
			links: [],
			trace_id,
			span_id: expect.any(String),
			parent_span_id: expect.any(String),
			children: [
				{
					name: 'sveltekit.load',
					status: { code: 0 },
					start_time: [expect.any(Number), expect.any(Number)],
					end_time: [expect.any(Number), expect.any(Number)],
					attributes: {
						'sveltekit.load.node_id': 'src/routes/+layout.server.js',
						'sveltekit.load.node_type': '+layout.server',
						'sveltekit.load.environment': 'server',
						'http.route': '/tracing/one/two/three/[...four]'
					},
					links: [],
					trace_id,
					span_id: expect.any(String),
					parent_span_id: expect.any(String),
					children: []
				},
				{
					name: 'sveltekit.load',
					status: { code: 0 },
					start_time: [expect.any(Number), expect.any(Number)],
					end_time: [expect.any(Number), expect.any(Number)],
					attributes: {
						'sveltekit.load.node_id': 'src/routes/+layout.js',
						'sveltekit.load.node_type': '+layout',
						'sveltekit.load.environment': 'server',
						'http.route': '/tracing/one/two/three/[...four]'
					},
					links: [],
					trace_id,
					span_id: expect.any(String),
					parent_span_id: expect.any(String),
					children: []
				}
			]
		});
	});

	test('correct spans are created for HttpError', async ({ page, read_traces }) => {
		const test_id = rand();
		const response = await page.goto(`/tracing/http-error?test_id=${test_id}`);
		expect(response?.status()).toBe(500);

		const traces = read_traces(test_id);
		const trace_id = traces[0].trace_id;
		const trace = traces[0];

		// Verify root span structure
		expect(trace).toEqual({
			name: 'sveltekit.handle.root',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/http-error',
				'http.method': 'GET',
				'http.url': expect.stringContaining(`/tracing/http-error?test_id=${test_id}`),
				'sveltekit.is_data_request': false,
				'sveltekit.is_sub_request': false,
				test_id
			},
			links: [],
			trace_id,
			span_id: expect.any(String),
			children: expect.arrayContaining([
				expect.objectContaining({
					name: 'sveltekit.handle.sequenced.set_tracing_test_id',
					attributes: {}
				})
			])
		});

		// Find and verify the resolve.root span
		const resolve_root_span = find_resolve_root_span(trace);
		expect(resolve_root_span).not.toBeNull();
		expect(resolve_root_span).toEqual({
			name: 'sveltekit.resolve',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/http-error',
				'http.response.status_code': 500,
				'http.response.body.size': expect.stringMatching(/^\d+$/)
			},
			links: [],
			trace_id,
			span_id: expect.any(String),
			parent_span_id: expect.any(String),
			children: expect.arrayContaining([
				expect.objectContaining({
					name: 'sveltekit.load',
					status: { code: 2, message: 'Internal server error from tracing test' },
					attributes: expect.objectContaining({
						'sveltekit.load.node_id': 'src/routes/tracing/http-error/+page.server.js',
						'sveltekit.load.result.type': 'known_error',
						'sveltekit.load.result.status': 500,
						'sveltekit.load.result.message': 'Internal server error from tracing test'
					})
				})
			])
		});
	});

	test('correct spans are created for Redirect', async ({ page, read_traces }) => {
		const test_id = rand();
		const response = await page.goto(`/tracing/redirect?test_id=${test_id}`);
		expect(response?.status()).toBe(200);

		const traces = read_traces(test_id);
		expect(traces).toHaveLength(2);
		const redirect_trace_id = traces[0].trace_id;
		const destination_trace_id = traces[1].trace_id;

		const redirect_trace = traces[0];
		const destination_trace = traces[1];

		// Verify redirect trace root span structure
		expect(redirect_trace).toEqual({
			name: 'sveltekit.handle.root',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/redirect',
				'http.method': 'GET',
				'http.url': expect.stringContaining(`/tracing/redirect?test_id=${test_id}`),
				'sveltekit.is_data_request': false,
				'sveltekit.is_sub_request': false,
				test_id
			},
			links: [],
			trace_id: redirect_trace_id,
			span_id: expect.any(String),
			children: expect.arrayContaining([
				expect.objectContaining({
					name: 'sveltekit.handle.sequenced.set_tracing_test_id',
					attributes: {}
				})
			])
		});

		// Find and verify the redirect resolve.root span
		const redirect_resolve_root_span = find_resolve_root_span(redirect_trace);
		expect(redirect_resolve_root_span).not.toBeNull();
		expect(redirect_resolve_root_span).toEqual({
			name: 'sveltekit.resolve',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/redirect',
				'http.response.status_code': 307,
				'http.response.body.size': expect.stringMatching(/^\d+$|^unknown$/)
			},
			links: [],
			trace_id: redirect_trace_id,
			span_id: expect.any(String),
			parent_span_id: expect.any(String),
			children: expect.arrayContaining([
				expect.objectContaining({
					name: 'sveltekit.load',
					status: { code: 0 },
					attributes: expect.objectContaining({
						'sveltekit.load.node_id': 'src/routes/tracing/redirect/+page.server.js',
						'sveltekit.load.result.type': 'redirect',
						'sveltekit.load.result.status': 307,
						'sveltekit.load.result.location': `/tracing/one/two/three/four/five?test_id=${test_id}`
					})
				})
			])
		});

		// Verify destination trace root span structure
		expect(destination_trace).toEqual({
			name: 'sveltekit.handle.root',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/one/two/three/[...four]',
				'http.method': 'GET',
				'http.url': expect.stringContaining(`/tracing/one/two/three/four/five?test_id=${test_id}`),
				'sveltekit.is_data_request': false,
				'sveltekit.is_sub_request': false,
				test_id
			},
			links: [],
			trace_id: destination_trace_id,
			span_id: expect.any(String),
			children: expect.arrayContaining([
				expect.objectContaining({
					name: 'sveltekit.handle.sequenced.set_tracing_test_id',
					attributes: {}
				})
			])
		});

		// Find and verify the destination resolve.root span
		const destination_resolve_root_span = find_resolve_root_span(destination_trace);
		expect(destination_resolve_root_span).not.toBeNull();
		expect(destination_resolve_root_span).toEqual({
			name: 'sveltekit.resolve',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/one/two/three/[...four]',
				'http.response.status_code': 200,
				'http.response.body.size': expect.stringMatching(/^\d+$/)
			},
			links: [],
			trace_id: destination_trace_id,
			span_id: expect.any(String),
			parent_span_id: expect.any(String),
			children: [
				{
					name: 'sveltekit.load',
					status: { code: 0 },
					start_time: [expect.any(Number), expect.any(Number)],
					end_time: [expect.any(Number), expect.any(Number)],
					attributes: {
						'sveltekit.load.node_id': 'src/routes/+layout.server.js',
						'sveltekit.load.node_type': '+layout.server',
						'sveltekit.load.environment': 'server',
						'http.route': '/tracing/one/two/three/[...four]'
					},
					links: [],
					trace_id: destination_trace_id,
					span_id: expect.any(String),
					parent_span_id: expect.any(String),
					children: []
				},
				{
					name: 'sveltekit.load',
					status: { code: 0 },
					start_time: [expect.any(Number), expect.any(Number)],
					end_time: [expect.any(Number), expect.any(Number)],
					attributes: {
						'sveltekit.load.node_id': 'src/routes/+layout.js',
						'sveltekit.load.node_type': '+layout',
						'sveltekit.load.environment': 'server',
						'http.route': '/tracing/one/two/three/[...four]'
					},
					links: [],
					trace_id: destination_trace_id,
					span_id: expect.any(String),
					parent_span_id: expect.any(String),
					children: []
				}
			]
		});
	});

	test('correct spans are created for regular Error', async ({ page, read_traces }) => {
		const test_id = rand();
		const response = await page.goto(`/tracing/regular-error?test_id=${test_id}`);
		expect(response?.status()).toBe(500);

		const traces = read_traces(test_id);
		const trace_id = traces[0].trace_id;
		const trace = traces[0];

		// Verify root span structure
		expect(trace).toEqual({
			name: 'sveltekit.handle.root',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/regular-error',
				'http.method': 'GET',
				'http.url': expect.stringContaining(`/tracing/regular-error?test_id=${test_id}`),
				'sveltekit.is_data_request': false,
				'sveltekit.is_sub_request': false,
				test_id
			},
			links: [],
			trace_id,
			span_id: expect.any(String),
			children: expect.arrayContaining([
				expect.objectContaining({
					name: 'sveltekit.handle.sequenced.set_tracing_test_id',
					attributes: {}
				})
			])
		});

		// Find and verify the resolve.root span
		const resolve_root_span = find_resolve_root_span(trace);
		expect(resolve_root_span).not.toBeNull();
		expect(resolve_root_span).toEqual({
			name: 'sveltekit.resolve',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/regular-error',
				'http.response.status_code': 500,
				'http.response.body.size': expect.stringMatching(/^\d+$/)
			},
			links: [],
			trace_id,
			span_id: expect.any(String),
			parent_span_id: expect.any(String),
			children: expect.arrayContaining([
				expect.objectContaining({
					name: 'sveltekit.load',
					status: { code: 2, message: 'Regular error from tracing test' },
					attributes: expect.objectContaining({
						'sveltekit.load.node_id': 'src/routes/tracing/regular-error/+page.server.js',
						'sveltekit.load.result.type': 'unknown_error'
					})
				})
			])
		});
	});

	test('correct spans are created for non-error object', async ({ page, read_traces }) => {
		const test_id = rand();
		const response = await page.goto(`/tracing/non-error-object?test_id=${test_id}`);
		expect(response?.status()).toBe(500);

		const traces = read_traces(test_id);
		const trace_id = traces[0].trace_id;
		const trace = traces[0];

		// Verify root span structure
		expect(trace).toEqual({
			name: 'sveltekit.handle.root',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/non-error-object',
				'http.method': 'GET',
				'http.url': expect.stringContaining(`/tracing/non-error-object?test_id=${test_id}`),
				'sveltekit.is_data_request': false,
				'sveltekit.is_sub_request': false,
				test_id
			},
			links: [],
			trace_id,
			span_id: expect.any(String),
			children: expect.arrayContaining([
				expect.objectContaining({
					name: 'sveltekit.handle.sequenced.set_tracing_test_id',
					attributes: {}
				})
			])
		});

		// Find and verify the resolve.root span
		const resolve_root_span = find_resolve_root_span(trace);
		expect(resolve_root_span).not.toBeNull();
		expect(resolve_root_span).toEqual({
			name: 'sveltekit.resolve',
			status: { code: 0 },
			start_time: [expect.any(Number), expect.any(Number)],
			end_time: [expect.any(Number), expect.any(Number)],
			attributes: {
				'http.route': '/tracing/non-error-object',
				'http.response.status_code': 500,
				'http.response.body.size': expect.stringMatching(/^\d+$/)
			},
			links: [],
			trace_id,
			span_id: expect.any(String),
			parent_span_id: expect.any(String),
			children: expect.arrayContaining([
				expect.objectContaining({
					name: 'sveltekit.load',
					status: { code: 2 },
					attributes: expect.objectContaining({
						'sveltekit.load.node_id': 'src/routes/tracing/non-error-object/+page.server.js',
						'sveltekit.load.result.type': 'unknown_error'
					})
				})
			])
		});
	});
});

test.describe('remote functions', () => {
	test("doesn't write bundle to disk when treeshaking prerendered remote functions", () => {
		test.skip(!!process.env.DEV, 'skip when in dev mode');
		expect(fs.existsSync(path.join(root, 'dist'))).toBe(false);
	});
});

test.describe('asset preload', () => {
	if (!process.env.DEV) {
		test('injects Link headers', async ({ request }) => {
			const response = await request.get('/asset-preload');

			const header = response.headers()['link'];

			expect(header).toContain('rel="modulepreload"');
			expect(header).toContain('as="font"');
		});

		test('does not inject Link headers on prerendered pages', async ({ request }) => {
			const response = await request.get('/asset-preload/prerendered');

			const header = response.headers()['link'];
			expect(header).toBeUndefined();
		});

		test('injects <link> tags on prerendered pages', async ({ request }) => {
			const response = await request.get('/asset-preload/prerendered');

			const body = await response.text();

			expect(body).toContain('rel="modulepreload"');
			expect(body).toContain('as="font"');
		});

		test('does not inject <link> tags on non-prerendered pages', async ({ request }) => {
			const response = await request.get('/asset-preload');

			const body = await response.text();

			expect(body).not.toContain('rel="modulepreload"');
			expect(body).not.toContain('as="font"');
		});
	}
});
