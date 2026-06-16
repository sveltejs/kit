// Shared factories for constructing minimal mock server objects (`RequestEvent`,
// `RequestState`, `SSROptions`, `SSRManifest`) in `src/**/*.spec.js` unit tests.
//
// These populate only the fields the runtime reads, cast to the real types. They
// are deliberately minimal — the full wiring (dynamic remote imports, devalue
// transport, request-store propagation) is exercised by the integration apps
// under `test/apps/**`, not by unit tests.

/** @import { RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { RemoteInternals, RequestState, SSROptions } from 'types' */

import { noop_span } from '../../src/runtime/telemetry/noop.js';

/**
 * @param {{
 *   method?: string,
 *   url?: string,
 *   headers?: HeadersInit,
 *   body?: BodyInit | null,
 *   signal?: AbortSignal
 * }} [options]
 * @returns {Request}
 */
export function create_mock_request({
	method = 'GET',
	url = 'http://localhost/',
	headers,
	body = null,
	signal
} = {}) {
	return new Request(url, { method, headers, body, signal });
}

/**
 * @param {Partial<RequestEvent>} [overrides]
 * @returns {RequestEvent}
 */
export function create_mock_event(overrides = {}) {
	const request = overrides.request ?? create_mock_request();

	return /** @type {RequestEvent} */ (
		/** @type {unknown} */ ({
			request,
			url: new URL(request.url),
			route: { id: null },
			params: {},
			fetch: () => Promise.resolve(new Response()),
			setHeaders: () => {},
			isDataRequest: false,
			isRemoteRequest: false,
			tracing: { enabled: false, root: noop_span, current: noop_span },
			...overrides
		})
	);
}

/**
 * @param {Partial<Omit<RequestState, 'remote'>> & { remote?: Partial<RequestState['remote']> }} [overrides]
 * @returns {RequestState}
 */
export function create_mock_state(overrides = {}) {
	return /** @type {RequestState} */ (
		/** @type {unknown} */ ({
			prerendering: undefined,
			transport: {},
			handleValidationError: () => ({ message: 'Bad Request' }),
			tracing: { record_span: (/** @type {any} */ { fn }) => fn(noop_span) },
			is_in_remote_function: false,
			is_in_remote_form_or_command: false,
			is_in_remote_query: false,
			is_in_render: false,
			is_in_universal_load: false,
			...overrides,
			remote: {
				data: null,
				implicit: null,
				explicit: null,
				forms: null,
				requested: null,
				batches: null,
				live_iterators: null,
				...overrides.remote
			}
		})
	);
}

/**
 * @param {Partial<SSROptions>} [overrides]
 * @returns {SSROptions}
 */
export function create_mock_options(overrides = {}) {
	return /** @type {SSROptions} */ (
		/** @type {unknown} */ ({
			...overrides,
			hooks: {
				transport: {},
				handleError: (/** @type {any} */ { message }) => ({ message }),
				.../** @type {any} */ (overrides).hooks
			}
		})
	);
}

/**
 * Builds a minimal remote function `internals` object cast to `RemoteInternals`.
 * @param {{ type: RemoteInternals['type'] } & Record<string, any>} internals
 * @returns {RemoteInternals}
 */
export function create_mock_internals(internals) {
	return /** @type {RemoteInternals} */ (
		/** @type {unknown} */ ({ id: '', name: '', ...internals })
	);
}

/**
 * Attaches `internals` to a remote function the way the real `query`/`command`/
 * `form` builders do (as `fn.__`), so it can be exposed via a mock manifest.
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {RemoteInternals} internals
 * @returns {T}
 */
export function create_mock_remote(fn, internals) {
	// @ts-expect-error attach internals like the real remote builders do
	fn.__ = internals;
	return fn;
}

/**
 * Builds a mock manifest whose `_.remotes[hash]()` resolves to `{ default: module }`.
 * @param {Record<string, Record<string, any>>} [remotes] map of hash -> module default export
 * @returns {SSRManifest}
 */
export function create_mock_manifest(remotes = {}) {
	/** @type {Record<string, () => Promise<{ default: Record<string, any> }>>} */
	const map = {};

	for (const hash in remotes) {
		map[hash] = () => Promise.resolve({ default: remotes[hash] });
	}

	return /** @type {SSRManifest} */ (/** @type {unknown} */ ({ _: { remotes: map } }));
}
