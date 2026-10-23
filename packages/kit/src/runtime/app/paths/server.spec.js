/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestState } from 'types' */
import { expect, test, vi } from 'vitest';
import { getRequestEvent, with_request_store } from '@sveltejs/kit/internal/server';
import { run_remote_function } from '../server/remote/shared.js';

vi.hoisted(() => {
	vi.stubGlobal('__SVELTEKIT_PATHS_BASE__', '');
	vi.stubGlobal('__SVELTEKIT_PATHS_ASSETS__', '');
	vi.stubGlobal('__SVELTEKIT_APP_DIR__', '_app');
	vi.stubGlobal('__SVELTEKIT_PATHS_RELATIVE__', true);
	vi.stubGlobal('__SVELTEKIT_DEV__', false);
});

const { resolve } = await import('./server.js');

/** @returns {RequestEvent} */
function event() {
	return /** @type {any} */ ({
		request: new Request('http://localhost/nested/page'),
		url: new URL('http://localhost/nested/page'),
		params: {},
		route: { id: '/nested/page' },
		cookies: { set: vi.fn(), delete: vi.fn(), get: () => undefined },
		setHeaders: vi.fn(),
		isRemoteRequest: false,
		isDataRequest: false
	});
}

test('resolve() falls back to an absolute path inside a remote query', async () => {
	const result = await run_remote_function(
		event(),
		/** @type {RequestState} */ ({ is_in_remote_query: true }),
		false,
		() => undefined,
		() => resolve('login')
	);

	expect(result).toBe('/login');
});

test('resolve() does not read event.url inside a remote query', async () => {
	await run_remote_function(
		event(),
		/** @type {RequestState} */ ({ is_in_remote_query: true }),
		false,
		() => undefined,
		() => {
			expect(resolve('/blog/[slug]', { slug: 'hello' })).toBe('/blog/hello');
			expect(() => getRequestEvent().url).toThrowKitError('remote_request_property', {
				contains: ['`event.url`']
			});
		}
	);
});

test('resolve() still uses a relative prefix outside a query', () => {
	const result = with_request_store(
		{
			event: event(),
			state: /** @type {RequestState} */ ({ is_in_remote_query: false })
		},
		() => resolve('login')
	);

	expect(result).toBe('../login');
});
