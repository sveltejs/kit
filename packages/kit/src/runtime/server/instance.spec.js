/** @import { InternalRequestOptions, SSRManifest } from 'types' */
import { afterAll, expect, test, vi } from 'vitest';
import { REROUTED_URL_HEADER } from '../../constants.js';

vi.mock(import('./page/render.js'), () => ({ render_response: vi.fn() }));
vi.mock(import('./page/server_routing.js'), () => ({
	resolve_route: vi.fn(),
	resolve_route_by_id: vi.fn()
}));
vi.mock('<sveltekit:generated>/env/config.js', () => ({}));
vi.mock('<sveltekit:generated>/server.js', () => ({
	get_hooks: () => Promise.resolve({}),
	options: { csrf_trusted_origins: [] }
}));

vi.stubGlobal('__SVELTEKIT_DEV__', false);
vi.stubGlobal('__SVELTEKIT_PATHS_ORIGIN__', undefined);
vi.stubGlobal('__SVELTEKIT_PATHS_BASE__', '');
vi.stubGlobal('__SVELTEKIT_PATHS_ASSETS__', '');
vi.stubGlobal('__SVELTEKIT_PATHS_RELATIVE__', false);
vi.stubGlobal('__SVELTEKIT_APP_DIR__', '_app');
vi.stubGlobal('__SVELTEKIT_CSRF_CHECK_ORIGIN__', true);
vi.stubGlobal('__SVELTEKIT_HASH_ROUTING__', false);
vi.stubGlobal('__SVELTEKIT_SERVER_TRACING_ENABLED__', false);
afterAll(() => vi.unstubAllGlobals());

const { respond } = await import('./instance.js');
const { set_hooks, set_manifest } = await import('./internal.js');

set_hooks({
	handle: () => Response.redirect('http://localhost/login', 303),
	handleFetch: ({ request, fetch }) => fetch(request),
	handleError: () => {},
	reroute: ({ url }) => (url.pathname === '/a' ? '/b' : undefined)
});
set_manifest(
	/** @type {SSRManifest} */ (
		/** @type {unknown} */ ({
			assets: new Set(),
			server_assets: {},
			prerendered_routes: new Set(),
			routes: [],
			matchers: () => Promise.resolve({})
		})
	)
);

test('adds rerouted URL header to responses with immutable headers', async () => {
	const response = await respond(
		new Request('http://localhost/a'),
		/** @type {InternalRequestOptions} */ ({ getClientAddress: () => '127.0.0.1' })
	);

	expect(response.status).toBe(303);
	expect(response.headers.get('location')).toBe('http://localhost/login');
	expect(response.headers.get(REROUTED_URL_HEADER)).toBe('http://localhost/b');
});
