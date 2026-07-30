/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestState } from 'types' */
import { expect, test, vi } from 'vitest';
import { HttpError } from '@sveltejs/kit/internal';
import { prerender } from './prerender.js';
import { stringify } from '../../../shared.js';

const store = vi.hoisted(() => ({ current: /** @type {any} */ (null) }));

vi.mock(import('@sveltejs/kit/internal/server'), async (actualPromise) => {
	const actual = await actualPromise();
	return {
		...actual,
		get_request_store: () => store.current
	};
});

vi.stubGlobal('__SVELTEKIT_DEV__', false);

/**
 * Creates a prerender function whose self-fetch of the prerendered response
 * resolves as specified, mimicking the production SSR path
 * @param {() => Response | Promise<Response>} fetch_impl
 */
function setup(fetch_impl) {
	const fn = vi.fn(() => 'from function');
	const wrapper = prerender(fn);
	/** @type {any} */ (wrapper).__.id = 'hash/fn';

	store.current = {
		event: /** @type {RequestEvent} */ (
			/** @type {unknown} */ ({
				request: { url: 'http://localhost/' },
				isRemoteRequest: false,
				cookies: {}
			})
		),
		state: /** @type {RequestState} */ (
			/** @type {unknown} */ ({
				transport: {},
				remote: {},
				prerendering: undefined,
				is_in_remote_query: false
			})
		)
	};

	vi.stubGlobal('fetch', vi.fn(fetch_impl));

	return { fn, wrapper };
}

test('propagates an error response instead of running the function', async () => {
	const { fn, wrapper } = setup(
		() =>
			new Response(JSON.stringify({ type: 'error', error: { status: 418, message: 'teapot' } }), {
				status: 200
			})
	);

	const rejection = await wrapper().catch((e) => e);

	expect(rejection).toBeInstanceOf(HttpError);
	expect(rejection.status).toBe(418);
	expect(rejection.body).toEqual({ status: 418, message: 'teapot' });
	expect(fn).not.toHaveBeenCalled();
});

test('parses a prerendered result without running the function', async () => {
	const { fn, wrapper } = setup(
		() =>
			new Response(JSON.stringify({ type: 'result', data: stringify({ _: 'prerendered' }, {}) }), {
				status: 200
			})
	);

	await expect(wrapper()).resolves.toBe('prerendered');
	expect(fn).not.toHaveBeenCalled();
});

test('falls back to the function when the fetch rejects', async () => {
	const { fn, wrapper } = setup(() => Promise.reject(new Error('connection refused')));

	await expect(wrapper()).resolves.toBe('from function');
	expect(fn).toHaveBeenCalledOnce();
});

test('falls back to the function on a non-ok response', async () => {
	const { fn, wrapper } = setup(() => new Response('not found', { status: 404 }));

	await expect(wrapper()).resolves.toBe('from function');
	expect(fn).toHaveBeenCalledOnce();
});

test('falls back to the function on a non-JSON response', async () => {
	const { fn, wrapper } = setup(() => new Response('<html></html>', { status: 200 }));

	await expect(wrapper()).resolves.toBe('from function');
	expect(fn).toHaveBeenCalledOnce();
});
