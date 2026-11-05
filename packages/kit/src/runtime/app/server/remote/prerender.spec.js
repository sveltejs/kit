/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestState } from 'types' */
import { once } from 'node:events';
import { createServer } from 'node:http';
import { afterAll, expect, test, vi } from 'vitest';

const store = vi.hoisted(() => ({ current: /** @type {any} */ (null) }));

vi.mock(import('@sveltejs/kit/internal/server'), async (actualPromise) => {
	const actual = await actualPromise();
	return {
		...actual,
		get_request_store: () => store.current
	};
});

vi.stubGlobal('__SVELTEKIT_DEV__', false);
afterAll(() => vi.unstubAllGlobals());

const { prerender } = await import('./prerender.js');

/**
 * Creates a prerender function whose self-fetch of the prerendered response
 * goes to the given origin, mimicking the production SSR path
 * @param {string} origin
 */
function setup(origin) {
	const fn = vi.fn(() => 'from function');
	const wrapper = prerender(fn);
	/** @type {any} */ (wrapper).__.id = 'hash/fn';

	store.current = {
		event: /** @type {RequestEvent} */ (
			/** @type {unknown} */ ({
				url: new URL(origin),
				request: new Request(origin),
				isRemoteRequest: false,
				cookies: {}
			})
		),
		state: /** @type {RequestState} */ (
			/** @type {unknown} */ ({
				remote: {},
				prerendering: undefined,
				is_in_remote_query: false,
				transport: {}
			})
		)
	};

	return { fn, wrapper };
}

test('falls back to the function without following redirects', async ({ onTestFinished }) => {
	/** @type {Array<string | undefined>} */
	const requests = [];
	const server = createServer((request, response) => {
		requests.push(request.url);

		if (request.url === '/_app/remote/hash/fn') {
			response.writeHead(302, { location: '/internal' });
		}

		response.end('private data');
	});
	onTestFinished(() => server[Symbol.asyncDispose]());

	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());

	// Model a spoofed origin whose prerendered response redirects to an internal resource.
	const { fn, wrapper } = setup(`http://127.0.0.1:${port}/`);

	await expect(wrapper()).resolves.toBe('from function');
	expect(fn).toHaveBeenCalledOnce();
	expect(requests).toEqual(['/_app/remote/hash/fn']);
});
