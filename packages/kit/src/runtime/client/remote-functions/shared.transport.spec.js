import { describe, expect, test, vi, beforeEach } from 'vitest';

// Mock `client.js` — the real module pulls in the SvelteKit router/hydration
// machinery and resolves `$app/paths` to a server-side virtual module that only
// exists during a real SvelteKit build. We only need stubs for the names that
// `shared.svelte.js` imports.
vi.mock(new URL('../client.js', import.meta.url).pathname, () => ({
	query_map: new Map(),
	query_responses: {},
	live_query_map: new Map(),
	_goto: () => {}
}));

// Mock `state.svelte.js` — imports `navigating` and `page` which are reactive
// Svelte state only available in a full SvelteKit runtime.
vi.mock(new URL('../state.svelte.js', import.meta.url).pathname, () => ({
	navigating: { current: null },
	page: { url: new URL('http://localhost/') },
	notify_version: () => {}
}));

const { remote_request } = await import('./shared.svelte.js');
const { HttpError, HandledHttpError } = await import('@sveltejs/kit/internal');

/**
 * Build a mock fetch Response. `remote_request` reads `response.headers` before
 * anything else, so every mock needs a `headers` object.
 * @param {Partial<Response> & { json?: () => Promise<any> }} props
 */
function mock_response(props) {
	return Promise.resolve({
		headers: new Headers(),
		ok: true,
		status: 200,
		statusText: 'OK',
		json: () => Promise.resolve({}),
		...props
	});
}

describe('remote_request transport error handling', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	test('non-OK response with JSON error body preserves status and error body', async () => {
		vi.stubGlobal('fetch', () =>
			mock_response({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				json: () =>
					Promise.resolve({
						type: 'error',
						status: 401,
						error: { status: 401, message: 'unauthorized' }
					})
			})
		);

		await expect(remote_request('/x')).rejects.toSatisfy((e) => {
			return (
				e instanceof HandledHttpError && e.status === 401 && e.body?.message === 'unauthorized'
			);
		});
	});

	test('non-OK response with non-JSON body falls back to response.status and statusText', async () => {
		vi.stubGlobal('fetch', () =>
			mock_response({
				ok: false,
				status: 503,
				statusText: 'Service Unavailable',
				json: () => Promise.reject(new SyntaxError('Unexpected token'))
			})
		);

		await expect(remote_request('/x')).rejects.toSatisfy((e) => {
			return e instanceof HttpError && !(e instanceof HandledHttpError) && e.status === 503;
		});
	});

	test('OK response with valid result payload does not throw an HttpError with status 500', async () => {
		// Build a minimal valid RemoteFunctionResponse with type 'result' and no data.
		const body = JSON.stringify({ type: 'result', data: null });

		vi.stubGlobal('fetch', () =>
			mock_response({
				json: () => Promise.resolve(JSON.parse(body))
			})
		);

		// Should resolve without throwing.
		await expect(remote_request('/x')).resolves.toBeDefined();
	});
});
