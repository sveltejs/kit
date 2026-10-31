import { beforeEach, expect, test, vi } from 'vitest';
import { create_fetch } from './fetch.js';
import { create_request_state } from './state.js';

const { context, respond } = vi.hoisted(() => ({
	context: { state: /** @type {import('types').RequestState | undefined} */ (undefined) },
	respond: vi.fn()
}));

vi.mock('@sveltejs/kit/internal/server', () => ({
	try_get_request_store: () => context.state && { state: context.state }
}));
vi.mock('./respond.js', () => ({ respond }));
vi.mock('#app/paths', () => ({ base: '', assets: '' }));
vi.mock('./utils.js', () => ({ has_prerendered_path: () => false }));
vi.mock('./internal.js', () => ({
	hooks: {
		handleFetch: /** @type {import('@sveltejs/kit/hooks').HandleFetch} */ (
			({ request, fetch }) => fetch(request)
		)
	},
	manifest: { assets: new Set(), server_assets: {} },
	read_implementation: null
}));

beforeEach(() => {
	context.state = undefined;
	respond.mockReset();
	respond.mockImplementation(async () => {
		// Simulate losing the synchronous request context after an await without ALS.
		context.state = undefined;
		await Promise.resolve();
		return new Response('set', { headers: { 'set-cookie': 'injected=a%20b; Path=/' } });
	});
});

for (const kind of ['load', 'query', 'prerender', 'command', 'no context']) {
	test(`fetched cookies respect the calling ${kind} context`, async () => {
		const state = create_request_state(/** @type {import('types').InternalRequestOptions} */ ({}));
		const event = /** @type {import('@sveltejs/kit').RequestEvent} */ ({
			url: new URL('https://example.org/page'),
			request: new Request('https://example.org/page')
		});
		const set_internal = vi.fn();
		const fetch = create_fetch({ event, state, get_cookie_header: () => '', set_internal });

		if (kind !== 'no context') {
			context.state = {
				...state,
				is_in_remote_query: kind === 'query',
				is_in_remote_prerender: kind === 'prerender',
				is_in_remote_form_or_command: kind === 'command'
			};
		}

		const response = await fetch('/set-cookie');
		expect(await response.text()).toBe('set');
		expect(response.headers.get('set-cookie')).toBe('injected=a%20b; Path=/');
		if (kind === 'query' || kind === 'prerender') {
			expect(set_internal).not.toHaveBeenCalled();
		} else {
			expect(set_internal).toHaveBeenCalledExactlyOnceWith('injected', 'a%20b', {
				path: '/',
				encode: expect.any(Function)
			});
		}
		// Subrequests keep their own execution context, regardless of the caller.
		expect(respond.mock.calls[0][1].is_in_remote_query).toBe(false);
	});
}
