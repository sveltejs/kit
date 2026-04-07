/** @import { RequestEvent, Cookies, RemoteQueryFunction, RemoteCommand, RemoteForm, RemoteFormInput } from '@sveltejs/kit' */
/** @import { RequestState, RequestStore } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */

import { with_request_store, try_get_request_store } from '@sveltejs/kit/internal/server';
import { HttpError } from '@sveltejs/kit/internal';
import { noop_span } from '../../runtime/telemetry/noop.js';
import { get_cookies } from '../../runtime/server/cookie.js';

/**
 * An `HttpError` subclass thrown when a remote function's schema validation fails
 * during testing. Extends `HttpError` so `instanceof HttpError` checks still pass,
 * but also exposes the Standard Schema `.issues` for test assertions.
 *
 * @example
 * ```js
 * import { HttpValidationError } from '@sveltejs/kit/test';
 *
 * try {
 *   await myQuery(invalidArg);
 * } catch (e) {
 *   if (e instanceof HttpValidationError) {
 *     console.log(e.status);  // 400
 *     console.log(e.issues);  // [{ message: 'Expected a string' }]
 *   }
 * }
 * ```
 */
export class HttpValidationError extends HttpError {
	/** @type {StandardSchemaV1.Issue[]} */
	issues;

	/**
	 * @param {number} status
	 * @param {App.Error} body
	 * @param {StandardSchemaV1.Issue[]} issues
	 */
	constructor(status, body, issues) {
		super(status, body);
		this.issues = issues;
	}
}

/**
 * Creates a mock `RequestEvent` for use in test environments.
 *
 * @example
 * ```js
 * import { createTestEvent } from '@sveltejs/kit/test';
 *
 * const event = createTestEvent({
 *   url: 'http://localhost/blog/hello',
 *   method: 'POST',
 *   locals: { user: { id: '123' } }
 * });
 * ```
 *
 * @param {object} [options]
 * @param {string} [options.url] The URL of the request. Defaults to `'http://localhost/'`.
 * @param {string} [options.method] The HTTP method. Defaults to `'GET'`.
 * @param {Record<string, string>} [options.headers] Request headers.
 * @param {App.Locals} [options.locals] Custom data for `event.locals`.
 * @param {Record<string, string>} [options.params] Route parameters.
 * @param {Record<string, string>} [options.cookies] Initial cookies as name-value pairs.
 * @param {Cookies} [options.cookiesObject] A full Cookies implementation (overrides `cookies`).
 * @param {string | null} [options.routeId] The route ID. Defaults to `'/'`.
 * @param {typeof fetch} [options.fetch] Custom fetch implementation.
 * @param {() => string} [options.getClientAddress] Custom client address function.
 * @param {Readonly<App.Platform>} [options.platform] Platform-specific data.
 * @param {BodyInit | null} [options.body] Request body.
 * @returns {RequestEvent}
 */
export function createTestEvent(options = {}) {
	const url = new URL(options.url ?? 'http://localhost/');
	const method = options.method ?? 'GET';

	// build cookie header from the initial cookies map, if provided
	const cookie_header = options.cookies
		? Object.entries(options.cookies)
				.map(([k, v]) => `${k}=${v}`)
				.join('; ')
		: '';

	const incoming_headers = new Headers(options.headers);
	if (cookie_header) {
		incoming_headers.set('cookie', cookie_header);
	}

	const request = new Request(url, {
		method,
		headers: incoming_headers,
		body: options.body ?? null
	});

	let cookies;
	if (options.cookiesObject) {
		cookies = options.cookiesObject;
	} else {
		const cookie_state = get_cookies(request, url);
		cookie_state.set_trailing_slash('never');
		cookies = cookie_state.cookies;
	}

	return /** @type {RequestEvent} */ ({
		cookies,
		fetch: options.fetch ?? globalThis.fetch,
		getClientAddress: options.getClientAddress ?? (() => '127.0.0.1'),
		locals: /** @type {App.Locals} */ (options.locals ?? {}),
		params: options.params ?? {},
		platform: options.platform,
		request,
		route: { id: options.routeId ?? '/' },
		setHeaders: () => {},
		url,
		isDataRequest: false,
		isSubRequest: false,
		isRemoteRequest: false,
		tracing: {
			enabled: false,
			root: noop_span,
			current: noop_span
		}
	});
}

/**
 * Creates a default `RequestState` suitable for test environments.
 *
 * The `handleValidationError` hook throws `HttpValidationError` directly,
 * short-circuiting the framework's `error(400, ...)` call. Since
 * `HttpValidationError` extends `HttpError`, existing `instanceof HttpError`
 * checks still pass — the only difference is the `.issues` property is
 * available for test assertions. This works identically regardless of whether
 * context was established via `withRequestContext` or auto-context.
 *
 * @param {object} [options]
 * @param {Record<string, { encode: (value: any) => any, decode: (value: any) => any }>} [options.transport]
 * @returns {RequestState}
 */
export function createTestState(options = {}) {
	return /** @type {RequestState} */ ({
		prerendering: undefined,
		transport: options.transport ?? {},
		handleValidationError: ({ issues }) => {
			throw new HttpValidationError(400, { message: 'Bad Request' }, issues);
		},
		tracing: {
			record_span: ({ fn }) => fn(noop_span)
		},
		remote: {
			data: null,
			forms: null,
			refreshes: null,
			requested: null,
			validated: null
		},
		is_in_remote_function: false,
		is_in_render: false,
		is_in_universal_load: false
	});
}

/**
 * Wraps a function call in a SvelteKit request context, making `getRequestEvent()`
 * and remote functions (`query`, `command`, `form`) work inside the callback.
 *
 * @example
 * ```js
 * import { createTestEvent, withRequestContext } from '@sveltejs/kit/test';
 * import { getRequestEvent } from '$app/server';
 *
 * const event = createTestEvent({ locals: { user: { id: '123' } } });
 * const locals = withRequestContext(event, () => getRequestEvent().locals);
 * // locals === { user: { id: '123' } }
 * ```
 *
 * @template T
 * @param {RequestEvent} event The mock request event (use `createTestEvent` to create one)
 * @param {() => T} fn The function to execute within the request context
 * @param {object} [options]
 * @param {Record<string, { encode: (value: any) => any, decode: (value: any) => any }>} [options.transport] Custom transport encoders/decoders
 * @returns {T}
 */
export function withRequestContext(event, fn, options = {}) {
	/** @type {RequestStore} */
	const store = {
		event,
		state: createTestState(options)
	};

	return with_request_store(store, fn);
}

const MUTATIVE_TYPES = ['command', 'form'];

/** @typedef {object} CallRemoteOptions
 * @property {string} [url] The URL of the request
 * @property {string} [method] Override the auto-detected HTTP method
 * @property {Record<string, string>} [headers] Request headers
 * @property {App.Locals} [locals] Custom data for `event.locals`
 * @property {Record<string, string>} [params] Route parameters
 * @property {Record<string, string>} [cookies] Initial cookies
 * @property {string | null} [routeId] The route ID
 * @property {Record<string, { encode: (value: any) => any, decode: (value: any) => any }>} [transport] Custom transport
 */

/**
 * Calls a RemoteQueryFunction with a test request context.
 *
 * If a remote function's schema validation fails, the resulting `HttpError` is caught
 * and rethrown as an `HttpValidationError` with the Standard Schema `.issues` attached.
 *
 * @template QueryOutput
 * @overload
 * @param {RemoteQueryFunction<void, QueryOutput>} fn
 * @param {void} [arg]
 * @param {CallRemoteOptions} [options]
 * @returns {Promise<QueryOutput>}
 */
/**
 * @template QueryInput
 * @template QueryOutput
 * @overload
 * @param {RemoteQueryFunction<QueryInput, QueryOutput>} fn
 * @param {QueryInput} arg
 * @param {CallRemoteOptions} [options]
 * @returns {Promise<QueryOutput>}
 */

/**
 * Calls a RemoteCommand with a test request context.
 *
 * If a remote function's schema validation fails, the resulting `HttpError` is caught
 * and rethrown as an `HttpValidationError` with the Standard Schema `.issues` attached.
 *
 * @template CommandOutput
 * @overload
 * @param {RemoteCommand<void, CommandOutput>} fn
 * @param {void} [arg]
 * @param {CallRemoteOptions} [options]
 * @returns {Promise<CommandOutput>}
 */
/**
 * @template CommandInput
 * @template CommandOutput
 * @overload
 * @param {RemoteCommand<CommandInput, CommandOutput>} fn
 * @param {CommandInput} arg
 * @param {CallRemoteOptions} [options]
 * @returns {Promise<CommandOutput>}
 */

/**
 * Calls a RemoteForm's handler with a test request context.
 *
 * If a remote function's schema validation fails, issues are
 * returned in output object (not thrown).
 *
 * @template FormOutput
 * @overload
 * @param {RemoteForm<void, FormOutput>} fn
 * @param {void} [arg]
 * @param {CallRemoteOptions} [options]
 * @returns {Promise<{ submission: true, result?: FormOutput, issues?: import('@sveltejs/kit').RemoteFormIssue[] }>}
 */
/**
 * @template {RemoteFormInput} FormInput
 * @template FormOutput
 * @overload
 * @param {RemoteForm<FormInput, FormOutput>} fn
 * @param {Record<string, any>} arg
 * @param {CallRemoteOptions} [options]
 * @returns {Promise<{ submission: true, result?: FormOutput, issues?: import('@sveltejs/kit').RemoteFormIssue[] }>}
 */

/**
 * Calls a remote function with a test request context. Auto-detects the HTTP
 * method from the function type (GET for queries, POST for commands and forms).
 *
 * @example
 * ```js
 * import { callRemote } from '@sveltejs/kit/test';
 * import { myQuery, myCommand, myForm } from './data.remote.ts';
 *
 * const value = await callRemote(myQuery, 'arg');
 * const result = await callRemote(myCommand, { name: 'Alice' });
 * const output = await callRemote(myForm, { name: 'Alice' });
 * // output.result, output.issues
 * ```
 *
 * @param {any} fn
 * @param {any} [arg]
 * @param {CallRemoteOptions} [options]
 * @returns {Promise<any>}
 */
export async function callRemote(fn, arg, options = {}) {
	const type = fn.__?.type;
	const method = options.method ?? (MUTATIVE_TYPES.includes(type) ? 'POST' : 'GET');
	const event = createTestEvent({ ...options, method });

	if (type === 'form') {
		// Forms aren't callable — invoke the internal handler directly with
		// form data as a POJO. Returns { submission, result, issues? } matching
		// actual form behavior (e.g. forms don't throw on validation failure).
		return withRequestContext(event, () => fn.__.fn(arg ?? {}, {}, null), options);
	}

	return withRequestContext(event, () => fn(arg), options);
}

/**
 * Sets `event.locals` on the current test's request context.
 * Can be called inside `withRequestContext`, or inside a test when
 * auto-context is active via the svelteKitTest Vitest plugin.
 *
 * @example
 * ```js
 * import { setLocals } from '@sveltejs/kit/test';
 * import { getRequestEvent } from '$app/server';
 *
 * setLocals({ user: { id: '123' } });
 * const { locals } = getRequestEvent();
 * // locals.user.id === '123'
 * ```
 *
 * @param {App.Locals} locals
 */
export function setLocals(locals) {
	const store = try_get_request_store();
	if (!store) {
		throw new Error(
			'No request context found. Call setLocals inside withRequestContext or ensure auto-context is active.'
		);
	}
	Object.assign(store.event.locals, locals);
}

export { mockRemote } from './mock-remote.js';
