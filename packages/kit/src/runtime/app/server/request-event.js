/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { InternalRequestOptions, RequestState } from 'types' */
import { Redirect } from '@sveltejs/kit/internal';
import { with_request_store } from '@sveltejs/kit/internal/server';
import { get_cookies } from '../../server/cookie.js';
import { create_set_headers } from '../../server/headers.js';
import { create_request_state } from '../../server/state.js';
import { noop_span } from '../../../telemetry.js';

/**
 * Runs `fn` inside a synthetic request, so that remote functions and [`getRequestEvent`](https://svelte.dev/docs/kit/$app-server#getRequestEvent) can be called outside of SvelteKit's server, for example in a unit test.
 *
 * Unless you pass a `request`, the request is a `POST` to `url` (default `http://localhost/`), like the requests the client makes for `command` and `form` functions. `event.fetch` is the global `fetch`, and `event.getClientAddress()` returns `127.0.0.1`.
 *
 * If `fn` returns a promise, the refreshes that `refresh()`, `set()`, `reconnect()` and `requested(...)` defer to the end of the request run after it resolves. Errors are not passed to `handleError`: the returned promise rejects with the original error of `fn` or of a refresh.
 *
 * @example
 * ```js
 * import { withRequestEvent } from '$app/server';
 * import { getPosts } from './posts.remote.js';
 *
 * const posts = await withRequestEvent({ locals: { user } }, () => getPosts({ author: 1 }));
 * ```
 * @template T
 * @param {{
 *   request?: Request;
 *   url?: string | URL;
 *   locals?: App.Locals;
 *   cookies?: Record<string, string>;
 *   params?: Record<string, string>;
 *   route?: { id: string | null };
 *   platform?: App.Platform;
 *   signal?: AbortSignal;
 * }} init `url` sets `event.url` (relative URLs are resolved against `http://localhost`). `cookies` are the cookies the request was sent with. They go on the `cookie` header, which browsers drop from a `Request`, so `cookies` (and a `cookie` header on a given `request`) only work outside browsers. `signal` is placed on the request, so aborting it stops a `query.live` generator. Without `url`, a `request` with the `x-sveltekit-pathname` and `x-sveltekit-search` headers of a remote call gets `event.url` from them, as on the server.
 * @param {(event: RequestEvent) => T} fn
 * @returns {T}
 * @since 3.3.0
 */
export function withRequestEvent(init, fn) {
	const url = new URL(init.url ?? init.request?.url ?? '/', 'http://localhost');

	// like `respond.js`, use the page URL that the client sends with remote calls
	const pathname = init.url ? null : init.request?.headers.get('x-sveltekit-pathname');
	if (pathname != null) {
		url.pathname = pathname;
		url.search = init.request?.headers.get('x-sveltekit-search') ?? '';
	}

	let request = init.request ?? new Request(url, { method: 'POST' });

	if (init.cookies || init.signal) {
		const headers = new Headers(request.headers);

		if (init.cookies) {
			const cookies = Object.entries(init.cookies).map(
				([name, value]) => `${name}=${encodeURIComponent(value)}`
			);
			const header = request.headers.get('cookie');
			headers.set('cookie', (header ? [header, ...cookies] : cookies).join('; '));
		}

		request = new Request(request, { headers, signal: init.signal });
	}

	const get_client_address = () => '127.0.0.1';

	const state = create_request_state(
		/** @type {InternalRequestOptions} */ ({
			getClientAddress: get_client_address,
			platform: init.platform
		})
	);

	const { cookies, set_trailing_slash } = get_cookies(request, url);

	// `trailingSlash` defaults to 'never', and there is no route to read it from
	set_trailing_slash('never');

	/** @type {RequestEvent} */
	const event = {
		cookies,
		// the global `fetch`, with relative URLs resolved against `url`
		fetch: (input, options) =>
			fetch(
				typeof input === 'string' || input instanceof URL ? new URL(input, url) : input,
				options
			),
		getClientAddress: get_client_address,
		locals: init.locals ?? {},
		params: init.params ?? {},
		platform: init.platform,
		request,
		route: init.route ?? { id: null },
		// headers aren't sent anywhere, but `setHeaders` follows the same rules as in a request
		setHeaders: create_set_headers(state),
		url,
		isDataRequest: false,
		isSubRequest: false,
		// remote functions run as if the client had called them
		isRemoteRequest: true,
		tracing: {
			enabled: false,
			root: noop_span,
			current: noop_span
		}
	};

	const store = { event, state };
	const result = with_request_store(store, () => fn(event));

	if (result instanceof Promise) {
		return /** @type {T} */ (
			result.then(async (value) => {
				// inside the store, like `collect_remote_data` in `handle_remote_call`,
				// because some queries (such as `query.batch`) read it when they run
				await with_request_store(store, () => run_refreshes(state));
				return value;
			})
		);
	}

	return result;
}

/**
 * Runs the refreshes that `refresh()`, `set()`, `reconnect()` and `requested(...)` defer
 * to the end of the request, like `collect_remote_data` does
 * @param {RequestState} state
 */
async function run_refreshes(state) {
	const explicit = state.remote.explicit;
	if (!explicit) return;

	/** @type {Set<string>} */
	const processed = new Set();

	// a refresh can defer more refreshes, so run until there are none left
	while (explicit.size > 0) {
		/** @type {Promise<void>[]} */
		const pending = [];

		for (const [remote_key, { fn }] of explicit) {
			explicit.delete(remote_key);
			if (processed.has(remote_key)) continue;
			processed.add(remote_key);

			pending.push(
				fn().then(
					() => {},
					(error) => {
						// a redirect is ignored here, as at the end of a request
						if (!(error instanceof Redirect)) throw error;
					}
				)
			);
		}

		await Promise.all(pending);
	}
}
