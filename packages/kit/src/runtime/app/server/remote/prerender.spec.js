/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestState } from 'types' */
import { expect, test, vi } from 'vitest';
import { HandledHttpError, ValidationError } from '@sveltejs/kit/internal';
import { prerender } from './prerender.js';
import { init_transport, stringify } from '#app/internal/transport';

init_transport({});

const store = vi.hoisted(() => ({ current: /** @type {any} */ (null) }));

vi.mock(import('@sveltejs/kit/internal/server'), async (actualPromise) => {
	const actual = await actualPromise();
	return {
		...actual,
		get_request_store: () => store.current
	};
});

vi.stubGlobal('__SVELTEKIT_DEV__', false);

const { handle_error_and_jsonify } = await import('../../../server/errors.js');

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

	expect(rejection).toBeInstanceOf(HandledHttpError);
	expect(rejection.status).toBe(418);
	expect(rejection.body).toEqual({ status: 418, message: 'teapot' });
	expect(fn).not.toHaveBeenCalled();

	const handleError = vi.fn();
	const transformed = await handle_error_and_jsonify(
		store.current.event,
		store.current.state,
		/** @type {any} */ ({ hooks: { handleError } }),
		rejection
	);

	expect(transformed).toBe(rejection.body);
	expect(handleError).not.toHaveBeenCalled();
});

test('passes validation errors to handleError without exposing issues by default', async () => {
	setup(() => new Response());
	const issues = [{ message: 'Expected a string' }];
	const handleError = vi.fn();

	const transformed = await handle_error_and_jsonify(
		store.current.event,
		store.current.state,
		/** @type {any} */ ({ hooks: { handleError } }),
		new ValidationError(issues)
	);

	expect(handleError).toHaveBeenCalledWith({
		kind: 'validation',
		error: { status: 400, message: 'Bad Request' },
		issues,
		event: store.current.event
	});
	expect(transformed).toEqual({ status: 400, message: 'Bad Request' });
});

test('parses a prerendered result without running the function', async () => {
	const { fn, wrapper } = setup(
		() =>
			new Response(JSON.stringify({ type: 'result', data: stringify({ _: 'prerendered' }) }), {
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
