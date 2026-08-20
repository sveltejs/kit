/** @import { Server } from '@sveltejs/kit' */
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createReadableStream, getRequest, setResponse } from '@sveltejs/kit/node';
import { loadEnv } from 'vite';
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import * as records from '../../../records.js';

// These tests call the built server directly, so they cover what the no-js Playwright
// project covered for server responses without a browser or a web server. server.setup.js
// builds the app first.

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, '.svelte-kit/output/server');

/** @type {string} */
let origin;

beforeAll(async () => {
	// the app writes test/errors.jsonl and test/spans.jsonl relative to cwd
	process.chdir(root);

	// the preview server gets these from Vite's .env loading
	for (const [key, value] of Object.entries(loadEnv('production', root, ''))) {
		process.env[key] ??= value;
	}

	const { manifest } = await import(pathToFileURL(path.join(out, 'manifest.js')).href);
	const { Server } = await import(pathToFileURL(path.join(out, 'index.js')).href);

	/** @type {Server} */
	const server = new Server(manifest);
	await server.init({
		env: process.env,
		read: (file) =>
			createReadableStream(
				path.join(fs.existsSync(path.join(out, file)) ? out : `${root}/static`, file)
			)
	});

	// the same wrapping adapter-node does, so responses get real HTTP semantics
	const listener = http.createServer(async (req, res) => {
		const request = getRequest({ request: req, response: res, base: origin });
		setResponse(res, await server.respond(request, { getClientAddress: () => '127.0.0.1' }));
	});
	await once(listener.listen(0, 'localhost'), 'listening');
	origin = `http://localhost:${/** @type {import('net').AddressInfo} */ (listener.address()).port}`;
});

/**
 * @param {string} pathname
 * @param {RequestInit} [init]
 */
const get = (pathname, init) => fetch(origin + pathname, init);

/**
 * Request a page and parse it, for the assertions that used `page.textContent`
 * @param {string} pathname
 * @param {RequestInit} [init]
 */
async function load(pathname, init) {
	const response = await get(pathname, init);
	const document = new DOMParser().parseFromString(await response.text(), 'text/html');
	return { response, document };
}

const read_errors = (/** @type {string} */ pathname) =>
	records.read_errors(path.join(root, 'test/errors.jsonl'), pathname);

const read_traces = (/** @type {string} */ test_id) =>
	records.read_traces(path.join(root, 'test/spans.jsonl'), test_id);

/** @type {http.Server[]} */
const servers = [];

/**
 * An external server for the tests that fetch across origins
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 */
async function start_server(handler) {
	const server = http.createServer(handler);
	servers.push(server);
	await once(server.listen(0, 'localhost'), 'listening');
	return { port: /** @type {import('net').AddressInfo} */ (server.address()).port };
}

afterEach(async () => {
	await Promise.all(servers.splice(0).map((server) => new Promise((r) => server.close(r))));
});

describe('Caching', () => {
	test('caches pages', async () => {
		const response = await get('/caching');
		expect(response.headers.get('cache-control')).toBe('public, max-age=30');
	});
});

describe('Content-Type', () => {
	test('sets Content-Type on page', async () => {
		const response = await get('/content-type-header');
		expect(response.headers.get('content-type')).toBe('text/html');
	});
});

describe('Content-Length', () => {
	test('sets Content-Length on page', async () => {
		const response = await get('/content-length-header');

		if (!response.headers.get('content-encoding')) {
			expect(Number(response.headers.get('content-length'))).toBeGreaterThan(1000);
		}
	});
});

describe('Cookies', () => {
	test('does not forward cookies from external domains', async () => {
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

		const response = await get(`/load/fetch-external-no-cookies?port=${port}`);
		expect(response.headers.getSetCookie().join('\n')).not.toContain('external=true');
	});
});

describe('CSRF', () => {
	test('Blocks requests with incorrect origin', async () => {
		const content_types = [
			'application/x-www-form-urlencoded',
			'multipart/form-data',
			'text/plain',
			'text/plaiN'
		];
		const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
		for (const method of methods) {
			for (const content_type of content_types) {
				const res = await get('/csrf', { method, headers: { 'content-type': content_type } });
				const message = `request method: ${method}, content-type: ${content_type}`;
				expect(res.status, message).toBe(403);
				expect(await res.text(), message).toBe(
					`Cross-site ${method} form submissions are forbidden`
				);
			}
		}
	});

	test('Allows requests from same origin', async () => {
		const res = await get('/csrf', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded', origin }
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('ok');
	});

	test('Allows requests from allowed origins', async () => {
		// Test with trusted.example.com which is in trustedOrigins
		const res1 = await get('/csrf', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://trusted.example.com'
			}
		});
		expect(res1.status).toBe(200);
		expect(await res1.text()).toBe('ok');

		// Test with payment-gateway.test which is also in trustedOrigins
		const res2 = await get('/csrf', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://payment-gateway.test'
			}
		});
		expect(res2.status).toBe(200);
		expect(await res2.text()).toBe('ok');
	});

	test('Blocks requests from non-allowed origins', async () => {
		// Test with origin not in trustedOrigins list
		const res1 = await get('/csrf', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://malicious-site.com'
			}
		});
		expect(res1.status).toBe(403);
		expect(await res1.text()).toBe('Cross-site POST form submissions are forbidden');

		// Test with similar but not exact origin
		const res2 = await get('/csrf', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://trusted.example.com.evil.com'
			}
		});
		expect(res2.status).toBe(403);
		expect(await res2.text()).toBe('Cross-site POST form submissions are forbidden');

		// Test subdomain attack (should be blocked)
		const res3 = await get('/csrf', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://evil.trusted.example.com'
			}
		});
		expect(res3.status).toBe(403);
		expect(await res3.text()).toBe('Cross-site POST form submissions are forbidden');
	});

	test('Allows GET requests regardless of origin', async () => {
		const res = await get('/csrf', {
			method: 'GET',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				origin: 'https://any-origin.com'
			}
		});
		expect(res.status).toBe(200);
	});

	test('Allows non-form content types regardless of origin', async () => {
		const res = await get('/csrf', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				origin: 'https://any-origin.com'
			}
		});
		expect(res.status).toBe(200);
	});

	test('Allows all protected HTTP methods from allowed origins', async () => {
		const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
		for (const method of methods) {
			const res = await get('/csrf', {
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

	test('Handles undefined origin correctly', async () => {
		// Some requests may have null origin (e.g., from certain mobile apps)
		const res = await get('/csrf', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			}
		});
		expect(res.status).toBe(403);
		expect(await res.text()).toBe('Cross-site POST form submissions are forbidden');
	});
});

describe('Endpoints', () => {
	test('invalid headers return a 500', async () => {
		const response = await get('/endpoint-output/head-write-error');
		expect(response.status).toBe(500);
		expect(await response.text()).toMatch(
			'TypeError [ERR_INVALID_CHAR]: Invalid character in header content ["x-test"]'
		);
	});

	test('stream can be canceled with TypeError', async () => {
		const responseBefore = await get('/endpoint-output/stream-typeerror?what');
		expect(await responseBefore.text()).toEqual('null');

		await expect(get('/endpoint-output/stream-typeerror')).rejects.toThrow('fetch failed');

		const responseAfter = await get('/endpoint-output/stream-typeerror?what');
		expect(await responseAfter.text()).toEqual('TypeError');
	});

	test('HEAD with matching headers but without body', async () => {
		const url = '/endpoint-output/body';

		const responses = {
			head: await get(url, { method: 'HEAD' }),
			get: await get(url)
		};

		const headers = {
			head: Object.fromEntries(responses.head.headers),
			get: Object.fromEntries(responses.get.headers)
		};

		expect(responses.head.status).toBe(200);
		expect(responses.get.status).toBe(200);
		expect(await responses.head.text()).toBe('');
		expect(await responses.get.text()).toBe('{}');

		['connection', 'date', 'keep-alive', 'transfer-encoding'].forEach((name) => {
			delete headers.head[name];
			delete headers.get[name];
		});

		expect(headers.head).toEqual(headers.get);
	});

	test('invalid request method returns allow header', async () => {
		const response = await get('/endpoint-output/body', {
			method: 'POST',
			headers: { origin: 'https://trusted.example.com' }
		});

		expect(response.status).toBe(405);

		const allow_header = response.headers.get('allow');
		expect(allow_header).toMatch(/\bGET\b/);
		expect(allow_header).toMatch(/\bHEAD\b/);
	});

	test('405 allow header has no duplicate methods listed', async () => {
		const response = await get('/endpoint-output/head-handler', {
			method: 'POST',
			headers: { origin: 'https://trusted.example.com' }
		});

		expect(response.status).toBe(405);

		const allow_header = /** @type {string} */ (response.headers.get('allow'));
		const methods = allow_header.split(',').map((m) => m.trim());
		const unique_methods = [...new Set(methods)];

		expect(methods).toEqual(unique_methods);
	});

	test('serves page for GET request when endpoint has no GET handler', async () => {
		const response = await get('/endpoint-output/post-only-with-page', {
			headers: {
				accept: '*/*'
			}
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/html');
		expect(await response.text()).toContain('POST-only endpoint page');
	});

	test('serves page for HEAD request when endpoint has no HEAD or GET handler', async () => {
		const response = await get('/endpoint-output/post-only-with-page', {
			method: 'HEAD',
			headers: {
				accept: '*/*'
			}
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/html');
		expect(response.headers.get('x-sveltekit-page')).toBe('true');
		expect(await response.text()).toBe('');
	});

	test('POST to post-only endpoint with sibling page still hits endpoint', async () => {
		const response = await get('/endpoint-output/post-only-with-page', {
			method: 'POST',
			headers: { origin: 'https://trusted.example.com' }
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('ok');
	});

	test('uses fallback handler instead of page when endpoint has no GET but has fallback', async () => {
		const response = await get('/endpoint-output/fallback-with-page', {
			headers: {
				accept: '*/*'
			}
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('catch-all');
	});

	test('content negotiation: API requests hit endpoint, browser requests hit page', async () => {
		// application/json → endpoint
		const api_response = await get('/routing/content-negotiation', {
			headers: {
				accept: 'application/json'
			}
		});

		expect(api_response.status).toBe(200);
		expect(await api_response.text()).toBe('GET');

		// text/html → page
		const html_response = await get('/routing/content-negotiation', {
			headers: {
				accept: 'text/html'
			}
		});

		expect(html_response.status).toBe(200);
		expect(html_response.headers.get('content-type')).toContain('text/html');
		expect(await html_response.text()).toContain('Hi');
	});

	// TODO all the remaining tests in this section are really only testing
	// setResponse, since we're not otherwise changing anything on the response.
	// might be worth making these unit tests instead
	test('multiple set-cookie on endpoints using GET', async () => {
		const response = await get('/set-cookie');

		const cookies = response.headers.getSetCookie();

		expect(cookies).toEqual([
			'answer=42; HttpOnly',
			'problem=comma, separated, values; HttpOnly',
			'name=SvelteKit; path=/; HttpOnly'
		]);
	});

	// TODO see above
	test('body can be a binary ReadableStream', async () => {
		await expect(get('/endpoint-output/stream-throw-error')).rejects.toThrow('fetch failed');

		const response = await get('/endpoint-output/stream');
		const body = Buffer.from(await response.arrayBuffer());
		const digest = createHash('sha256').update(body).digest('base64url');
		expect(response.headers.get('digest')).toEqual(`sha-256=${digest}`);
	});

	// TODO see above
	test('request body can be read slow', async () => {
		const data = randomBytes(1024 * 256);
		const digest = createHash('sha256').update(data).digest('base64url');
		const response = await get('/endpoint-input/sha256', {
			method: 'PUT',
			headers: { 'content-type': 'application/octet-stream' },
			body: data
		});
		expect(await response.text()).toEqual(digest);
	});

	test('OPTIONS handler', async () => {
		const url = '/endpoint-output';

		const response = await get(url, {
			method: 'OPTIONS'
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('ok');
	});

	test('HEAD handler', async () => {
		const url = '/endpoint-output/head-handler';

		const page_response = await get(url, {
			method: 'HEAD',
			headers: {
				accept: 'text/html'
			}
		});

		expect(page_response.status).toBe(200);
		expect(await page_response.text()).toBe('');
		expect(page_response.headers.get('x-sveltekit-page')).toBe('true');

		const endpoint_response = await get(url, {
			method: 'HEAD',
			headers: {
				accept: 'application/json'
			}
		});

		expect(endpoint_response.status).toBe(200);
		expect(await endpoint_response.text()).toBe('');
		expect(endpoint_response.headers.get('x-sveltekit-head-endpoint')).toBe('true');
	});

	test('catch-all handler', async () => {
		const url = '/endpoint-output/fallback';

		let response = await get(url, {
			method: 'GET'
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('ok');

		response = await get(url, {
			method: 'MOVE' // also works with arcane methods
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('catch-all');

		response = await get(url, {
			method: 'OPTIONS'
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('catch-all');
	});

	test('QUERY handler', async () => {
		const url = '/endpoint-output/query';

		let response = await get(url, {
			method: 'QUERY',
			body: 'name=world'
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('query: name=world');

		response = await get(url, {
			method: 'MOVE'
		});

		expect(response.status).toBe(405);
		expect(response.headers.get('allow')).toBe('GET, QUERY, HEAD');
	});

	test('can get assets using absolute path', async () => {
		const response = await get('/endpoint-output/fetch-asset/absolute');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/plain');
		expect(await response.text()).toBe('Cos sie konczy, cos zaczyna');
	});

	test('can get assets using relative path', async () => {
		const response = await get('/endpoint-output/fetch-asset/relative');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/plain');
		expect(await response.text()).toBe('Cos sie konczy, cos zaczyna');
	});
});

describe('Errors', () => {
	test('uses the handleError status for the fallback page served to error-page sub-requests', async () => {
		const response = await get('/errors/handle-error-status-fallback', {
			headers: { 'x-sveltekit-error': 'true' }
		});
		expect(response.status).toBe(503);
	});

	test('invalid route response is handled', async () => {
		const response = await get('/errors/invalid-route-response');

		expect(response.status).toBe(500);
		expect(await response.text()).toMatch(
			'Invalid response from route /errors/invalid-route-response: handler should return a Response object'
		);
	});

	test('unhandled http method', async () => {
		const response = await get('/errors/invalid-route-response', {
			method: 'PUT',
			headers: { origin: 'https://trusted.example.com' }
		});

		expect(response.status).toBe(405);
		expect(await response.text()).toMatch('PUT method not allowed');
	});

	test('error evaluating module', async () => {
		const response = await get('/errors/init-error-endpoint');

		expect(response.status).toBe(500);
		expect(await response.text()).toMatch('thisvariableisnotdefined is not defined');
	});

	test('returns a lightweight 404 for subresource requests', async () => {
		// distinct from the path used by the test below, which _does_ invoke the hook
		const response = await get('/errors/does-not-exist-lightweight-subresource', {
			headers: { 'sec-fetch-dest': 'image' }
		});

		expect(response.status).toBe(404);
		expect(await response.text()).toBe('Not Found');
		expect(response.headers.get('vary')).toContain('Sec-Fetch-Dest');

		// lightweight 404s bypass the handleError hook
		expect(read_errors('/errors/does-not-exist-lightweight-subresource')).toBe(undefined);
	});

	test('renders the error page for document and fetch requests', async () => {
		for (const destination of ['document', null, 'empty']) {
			const response = await get(
				'/errors/does-not-exist-subresource',
				destination ? { headers: { 'sec-fetch-dest': destination } } : {}
			);

			expect(response.status).toBe(404);
			expect(await response.text()).toContain('This is your custom error page saying:');
		}
	});

	test('stack traces are not fixed twice', async () => {
		let { document } = await load('/errors/stack-trace');
		expect(document.querySelector('#message')?.textContent).toBe(
			'This is your custom error page saying: "Cannot read properties of undefined (reading \'toUpperCase\') (500 Internal Error)"'
		);

		// check the stack wasn't mutated
		({ document } = await load('/errors/stack-trace'));
		expect(document.querySelector('#message')?.textContent).toBe(
			'This is your custom error page saying: "Cannot read properties of undefined (reading \'toUpperCase\') (500 Internal Error)"'
		);
	});

	test('error(...) in endpoint', async () => {
		// HTML
		{
			const res = await get('/errors/endpoint-throw-error', {
				headers: {
					accept: 'text/html'
				}
			});

			expect(read_errors('/errors/endpoint-throw-error')).toEqual({
				kind: 'app',
				error: { status: 401, message: 'You shall not pass' }
			});

			expect(res.status).toBe(401);
			expect(await res.text()).toContain(
				'This is the static error page with the following message: You shall not pass'
			);
		}

		// JSON (default)
		{
			const res = await get('/errors/endpoint-throw-error');

			expect(read_errors('/errors/endpoint-throw-error')).toEqual({
				kind: 'app',
				error: { status: 401, message: 'You shall not pass' }
			});

			expect(res.status).toBe(401);
			expect(await res.json()).toEqual({
				message: 'You shall not pass',
				status: 401
			});
		}
	});

	test('redirect(...) in endpoint', async () => {
		const { response, document } = await load('/errors/endpoint-throw-redirect');
		expect(response.status).toBe(200); // redirects are opaque to the browser

		const error = read_errors('/errors/endpoint-throw-redirect');
		expect(error).toBe(undefined);

		expect(document.querySelector('h1')?.textContent).toBe('the answer is 42');
	});

	test('POST to missing page endpoint', async () => {
		const res = await get('/errors/missing-actions', {
			method: 'POST',
			headers: {
				accept: 'text/html',
				origin: 'https://trusted.example.com'
			}
		});
		expect(res.status).toBe(405);

		const res_json = await get('/errors/missing-actions', {
			method: 'POST',
			headers: {
				accept: 'application/json',
				origin: 'https://trusted.example.com'
			}
		});
		expect(res_json.status).toBe(405);
		expect(await res_json.json()).toEqual({
			type: 'error',
			location: '/errors/missing-actions',
			error: {
				message: 'Method Not Allowed (405 Method Not Allowed)',
				status: 405
			}
		});
	});

	test('error thrown in handle results in a rendered error page or JSON response', async () => {
		// HTML
		{
			const res = await get('/errors/error-in-handle', {
				headers: {
					accept: 'text/html'
				}
			});

			expect(res.status).toBe(500);
			expect(await res.text()).toContain(
				'This is the static error page with the following message: Error in handle'
			);
		}

		// JSON (default)
		{
			const res = await get('/errors/error-in-handle');

			const error = await res.json();

			expect(error.stack).toBe(undefined);
			expect(res.status).toBe(500);
			expect(error).toEqual({
				message: 'Error in handle (500 Internal Error)',
				status: 500
			});
		}
	});

	test('expected error thrown in handle results in a rendered error page or JSON response', async () => {
		// HTML
		{
			const res = await get('/errors/expected-error-in-handle', {
				headers: {
					accept: 'text/html'
				}
			});

			expect(res.status).toBe(500);
			expect(await res.text()).toContain(
				'This is the static error page with the following message: Expected error in handle'
			);
		}

		// JSON (default)
		{
			const res = await get('/errors/expected-error-in-handle');

			const error = await res.json();

			expect(error.stack).toBe(undefined);
			expect(res.status).toBe(500);
			expect(error).toEqual({
				message: 'Expected error in handle',
				status: 500
			});
		}
	});

	test('error thrown from load on the server respects page options when rendering the error page', async () => {
		const res = await get('/errors/load-error-page-options/csr');
		expect(res.status).toBe(500);
		const content = await res.text();
		expect(content).toContain('Crashing now');
		// the hydration script should not be present if the csr page option is respected
		expect(content).not.toContain('kit.start(app');
	});

	test('returns root layout data for a missing route error page data request', async () => {
		const data_response = await get(
			'/this-route-does-not-exist/__data.json?x-sveltekit-invalidated=1'
		);
		expect(data_response.status).toBe(200);
		expect(data_response.headers.get('content-type')).toContain('application/json');

		const data = await data_response.json();
		expect(data.type).toBe('data');
		expect(data.nodes[0].type).toBe('data');
		expect(data.nodes[0].data).toContain('rootlayout');

		const page_response = await get('/this-route-does-not-exist/__data.json');
		expect(page_response.status).toBe(404);
		expect(page_response.headers.get('content-type')).toContain('text/html');

		// a single-node request that invalidates nothing is not an error-page data request
		const crafted_response = await get(
			'/this-route-does-not-exist/__data.json?x-sveltekit-invalidated=0'
		);
		expect(crafted_response.status).toBe(404);
	});
});

describe('Load', () => {
	test('fetch does not load a file with a # character', async () => {
		const response = await get('/load/static-file-with-hash');
		expect(await response.text()).toContain('status: 404');
	});

	test('fetching a non-existent resource in root layout fails without hanging', async () => {
		const response = await get('/errors/error-in-layout');
		expect(await response.text()).toContain('Error: 404');
	});

	test('fetch reads universal load assets on the server', async () => {
		const { document } = await load('/load/fetch-asset');
		expect(document.querySelector('p')?.textContent).toBe('1');
	});

	test('does not forward accept-language to internal fetch when the request has none', async () => {
		// unlike browsers and fetch, a bare http client sends no accept-language header
		const html = await new Promise((fulfil) => {
			http.get(
				`${origin}/load/fetch-request-headers`,
				{ headers: { accept: '*/*', 'user-agent': 'node' } },
				(res) => {
					let body = '';
					res.on('data', (chunk) => (body += chunk));
					res.on('end', () => fulfil(body));
				}
			);
		});
		const headers = JSON.parse(
			/** @type {RegExpMatchArray} */ (/<pre>(.+?)<\/pre>/s.exec(html))[1]
		);
		expect(headers.accept).toBe('*/*');
		expect(headers['accept-language']).toBeUndefined();
	});

	test('includes origin header on non-GET internal request', async () => {
		const { document } = await load('/load/fetch-origin-internal');
		expect(document.querySelector('h1')?.textContent).toBe(`origin: ${origin}`);
	});

	test('includes origin header on external request', async () => {
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

		const { document } = await load(`/load/fetch-origin-external?port=${port}`);
		expect(document.querySelector('h1')?.textContent).toBe(`origin: ${origin}`);
	});

	test('does not run when using invalid request methods', async () => {
		const load_url = '/load';

		let response = await get(load_url, {
			method: 'OPTIONS'
		});

		expect(response.status).toBe(204);
		expect(await response.text()).toBe('');
		expect(response.headers.get('allow')).toBe('GET, HEAD, OPTIONS');

		const actions_url = '/actions/enhance';
		response = await get(actions_url, {
			method: 'OPTIONS'
		});

		expect(response.status).toBe(204);
		expect(await response.text()).toBe('');
		expect(response.headers.get('allow')).toBe('GET, HEAD, OPTIONS, POST');
	});

	test('allows logging URL search params', async () => {
		const { document } = await load('/load/server-log-search-param');

		expect(document.querySelector('p')?.textContent).toBe('hello world');
	});
});

describe('Routing', () => {
	test('event.params are available in handle', async () => {
		const response = await get('/routing/params-in-handle/banana');
		expect(await response.json()).toStrictEqual({
			key: '/routing/params-in-handle/[x]',
			params: { x: 'banana' }
		});
	});

	test('/favicon.ico is a valid route', async () => {
		const response = await get('/favicon.ico');
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data).toEqual({ surprise: 'lol' });
	});

	test('falls back to page actions if sibling endpoint has no POST handler', async () => {
		const response = await get('/endpoint-output/actions-with-endpoint', {
			method: 'POST',
			body: new URLSearchParams(),
			headers: {
				accept: 'application/json',
				origin
			}
		});

		expect(response.status).toBe(200);
		expect((await response.json()).type).toBe('success');
	});
});

describe('Shadowed pages', () => {
	test('Action can return undefined', async () => {
		const response = await get('/shadowed/simple/post', {
			method: 'POST',
			body: new URLSearchParams(),
			headers: {
				accept: 'application/json',
				origin
			}
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			type: 'success',
			status: 204,
			location: '/shadowed/simple/post'
		});
	});

	test('action response includes the stripped landing location', async () => {
		const response = await get('/actions/cross-page/destination?redirectTo=%2Fdashboard&/failure', {
			method: 'POST',
			body: new URLSearchParams({ username: 'paolo' }),
			headers: {
				accept: 'application/json',
				origin
			}
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			type: 'failure',
			status: 400,
			location: '/actions/cross-page/destination?redirectTo=%2Fdashboard',
			data: '[{"problem":1,"username":2},"invalid","paolo"]'
		});
	});

	test('Action fail() returns matching HTTP status code', async () => {
		const response = await get('/actions/form-errors', {
			method: 'POST',
			body: new URLSearchParams(),
			headers: {
				accept: 'application/json',
				origin
			}
		});

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.type).toBe('failure');
		expect(body.status).toBe(400);
	});
});

describe('setHeaders', () => {
	test('allows multiple set-cookie headers with different values', async () => {
		const response = await get('/headers/set-cookie/sub');
		const cookies = response.headers.getSetCookie().join('\n');

		expect(cookies).toMatch('cookie1=value1');
		expect(cookies).toMatch('cookie2=value2');
	});
});

describe('cookies', () => {
	test('cookie.stringifySetCookie created correct cookie header string', async () => {
		const response = await get('/cookies/serialize');
		const cookies = response.headers.getSetCookie().join('\n');

		expect(cookies).toMatch('before=before');
		expect(cookies).toMatch('after=after');
		expect(cookies).toMatch('endpoint=endpoint');
	});
});

describe('Miscellaneous', () => {
	test('handles responses with immutable headers', async () => {
		const response = await get('/immutable-headers');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('foo');
	});

	test('does not send x-sveltekit-version header on document responses', async () => {
		const response = await get('/');
		expect(response.headers.get('x-sveltekit-version')).toBeNull();
	});

	test('sends x-sveltekit-version header on data responses', async () => {
		const response = await get('/__data.json');
		expect(response.headers.get('x-sveltekit-version')).toBeTruthy();
	});
});

describe('reroute', () => {
	test('Apply reroute when directly accessing a page', async () => {
		const { document } = await load('/reroute/basic/a');
		expect(document.querySelector('h1')?.textContent).toContain(
			'Successfully rewritten, URL should still show a: /reroute/basic/a'
		);
	});

	test('Apply async reroute when directly accessing a page', async () => {
		const { document } = await load('/reroute/async/a', {
			headers: { cookie: 'reroute-cookie=yes' }
		});
		expect(document.querySelector('h1')?.textContent).toContain(
			'Successfully rewritten, URL should still show a: /reroute/async/a'
		);
	});

	test('Returns a 500 response if reroute throws an error on the server', async () => {
		const response = await get('/reroute/error-handling/server-error');
		expect(response.status).toBe(500);
	});
});

describe('init', () => {
	test('init server hook is called once before the load function', async () => {
		let { document } = await load('/init-hooks');
		expect(document.querySelector('p')?.textContent).toBe('1');
		({ document } = await load('/init-hooks'));
		expect(document.querySelector('p')?.textContent).toBe('1');
	});
});

describe('getRequestEvent', () => {
	test('getRequestEvent works in server endpoints', async () => {
		const response = await get('/get-request-event/endpoint');
		expect(await response.text()).toBe('hello from hooks.server.js');
	});
});

describe('$app/forms', () => {
	test('deserialize works on the server', async () => {
		const response = await get('/serialization-form-non-enhanced/server-deserialize');
		expect(await response.json()).toEqual({ data: 'It works!' });
	});
});

describe('$app/env', () => {
	test('treeshakes dev check', async () => {
		const code = fs.readFileSync(
			path.join(root, '.svelte-kit/output/server/entries/pages/treeshaking/dev/_page.svelte.js'),
			'utf-8'
		);
		expect(code).not.toContain('not prod');
	});

	test('treeshakes browser check', async () => {
		const code = fs.readFileSync(
			path.join(
				root,
				'.svelte-kit/output/server/entries/pages/treeshaking/browser/_page.svelte.js'
			),
			'utf-8'
		);
		expect(code).not.toMatch('client');
	});
});

describe('tracing', () => {
	// Helper function to find the resolve.root span deep in the handle.child chain
	/**
	 * @param {import('../../../types.js').SpanTree} span
	 * @returns {import('../../../types.js').SpanTree | null}
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

	test('correct spans are created for a regular navigation', async () => {
		const test_id = rand();
		await get(`/tracing/one/two/three/four/five?test_id=${test_id}`);
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

	test('correct spans are created for HttpError', async () => {
		const test_id = rand();
		const response = await get(`/tracing/http-error?test_id=${test_id}`);
		expect(response.status).toBe(500);

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

	test('correct spans are created for Redirect', async () => {
		const test_id = rand();
		const response = await get(`/tracing/redirect?test_id=${test_id}`);
		expect(response.status).toBe(200);

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

	test('correct spans are created for regular Error', async () => {
		const test_id = rand();
		const response = await get(`/tracing/regular-error?test_id=${test_id}`);
		expect(response.status).toBe(500);

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

	test('correct spans are created for non-error object', async () => {
		const test_id = rand();
		const response = await get(`/tracing/non-error-object?test_id=${test_id}`);
		expect(response.status).toBe(500);

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

describe('asset preload', () => {
	test('does not inject Link headers', async () => {
		const response = await get('/asset-preload');

		const header = response.headers.get('link');
		expect(header).toBeNull();
	});

	test('injects <link> tags', async () => {
		const response = await get('/asset-preload');

		const body = await response.text();

		expect(body).toContain('rel="modulepreload"');
		expect(body).toContain('as="font"');
		expect(body).toMatch(/href="[^"]+\/shlop\.[^".]+\.woff2"/);
		expect(body).toMatch(/href="[^"]+\/shlop\.var\.[^".]+\.woff2"/);
		// the emitted file name is sanitized, but the filter matched on the original `shlop+bold.woff2`
		expect(body).toMatch(/href="[^"]+\/shlop_bold\.[^".]+\.woff2"/);
	});
});

describe('Streaming', () => {
	test("Discarded promises from server load functions don't hang SSR request", async () => {
		let error;
		try {
			await (await get('/streaming/discarded-promise')).text();
		} catch (e) {
			error = e;
		}

		expect(error).toBeUndefined();
	});
});
