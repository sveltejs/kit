/** @import { RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { SSROptions, SSRState } from 'types' */
import { once } from 'node:events';
import { createServer } from 'node:http';
import { afterAll, describe, expect, onTestFinished, test, vi } from 'vitest';

// These fallbacks don't render pages or use the generated server module.
vi.mock(import('./page/render.js'), () => ({ render_response: vi.fn() }));
vi.mock('__sveltekit/server', () => ({ read_implementation: null, manifest: null }));
vi.mock('__sveltekit/env', () => ({ rendered_env: null }));

vi.stubGlobal('__SVELTEKIT_DEV__', false);
afterAll(() => vi.unstubAllGlobals());

const { create_fetch } = await import('./fetch.js');

const options = /** @type {SSROptions} */ (
	/** @type {unknown} */ ({
		hooks: {
			handle: (/** @type {any} */ { event, resolve }) => resolve(event),
			handleFetch: (/** @type {any} */ { request, fetch }) => fetch(request),
			handleError: () => {},
			reroute: (/** @type {any} */ { url }) =>
				url.pathname === '/rerouted' ? '/prerendered' : undefined,
			transport: {}
		},
		csrf_check_origin: true,
		csrf_trusted_origins: [],
		hash_routing: false
	})
);

const manifest = /** @type {SSRManifest} */ (
	/** @type {unknown} */ ({
		assets: new Set(['asset.txt']),
		mimeTypes: {},
		_: {
			server_assets: {},
			prerendered_routes: new Set(['/prerendered']),
			routes: [],
			matchers: () => Promise.resolve({}),
			nodes: []
		}
	})
);

describe('redirect handling', () => {
	test.each([
		{ name: 'static asset fallback', path: '/asset.txt' },
		{ name: 'prerendered path fallback', path: '/prerendered' },
		{ name: 'rerouted prerendered path fallback', path: '/rerouted' },
		{ name: 'unresolved subrequest fallback', path: '/missing' },
		{ name: 'error-page subrequest fallback', path: '/missing', error: true },
		{ name: 'external fetch follows redirects', path: '/external', external: true }
	])('$name', async ({ path, error = false, external = false }) => {
		/** @type {Array<string | undefined>} */
		const requests = [];
		const server = createServer((request, response) => {
			requests.push(request.url);

			if (request.url === '/internal') {
				response.end('private data');
			} else {
				response.writeHead(302, { location: '/internal' });
				response.end('redirect');
			}
		});
		onTestFinished(() => server[Symbol.asyncDispose]());

		server.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
		const origin = `http://127.0.0.1:${port}`;

		// For self-fetches, model an attacker-controlled request origin.
		const url = new URL(external ? 'http://app.invalid/' : origin);
		const state = /** @type {SSRState} */ ({ depth: 0, error });
		const fetch = create_fetch({
			event: /** @type {RequestEvent} */ ({ url, request: new Request(url) }),
			options,
			manifest,
			state,
			get_cookie_header: () => '',
			set_internal: () => {}
		});

		const response = await fetch(`${origin}${path}`);
		const body = await response.text();
		const requested_path = path === '/rerouted' ? '/prerendered' : path;

		expect(requests).toEqual(external ? [requested_path, '/internal'] : [requested_path]);
		expect(response.status).toBe(external ? 200 : 302);
		expect(response.headers.get('location')).toBe(external ? null : '/internal');
		expect(body).toBe(external ? 'private data' : 'redirect');
	});
});
