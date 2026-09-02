import { noop } from '../../utils/functions.js';
import { IN_WEBCONTAINER, REROUTED_URL_HEADER } from '../../constants.js';
import { respond as handle } from './respond.js';
import { create_request_state } from './state.js';
import { configure, options, get_hooks } from '<sveltekit:generated>/server.js';
import { set_manifest, set_options, set_hooks, fix_stack_trace } from './internal.js';
import { init_tracing } from '@sveltejs/kit/internal/server';
import { DEV } from 'esm-env';
import { init_transport } from '#app/internal/transport';

// set at module scope because prerendering evaluates user modules before `init` runs
set_options(options);

/** @type {Promise<any>} */
let init_promise;

/**
 * Responses that were created with our monkey-patched `fetch`, which may need
 * to have their `content-encoding` and `content-length` headers removed
 * if returned directly (i.e. `fetch` is being used to proxy a request)
 * @type {WeakMap<Response, Error>}
 */
const decoded_responses = new WeakMap();

if (DEV) {
	const fetch = globalThis.fetch;

	/**
	 * @param {RequestInfo | URL} info
	 * @param {RequestInit} [init]
	 */
	globalThis.fetch = async (info, init) => {
		const response = await fetch(info, init);
		const encoding = response.headers.get('content-encoding');

		if (encoding) {
			decoded_responses.set(
				response,
				new Error(
					`Cannot return \`fetch(...)\` directly from a handler if the response has a \`Content-Encoding: ${encoding}\` header. The body has already been decoded`
				)
			);
		}

		return response;
	};
}

/**
 * Configures the runtime and loads the user's hooks. Adapters call this at startup, some of them
 * again per request to refresh `env`, so only the hooks are guarded against running twice
 * @param {import('types').ServerConfigureOptions} [opts]
 */
export async function init(opts) {
	if (__SVELTEKIT_SERVER_TRACING_ENABLED__) init_tracing(import('@opentelemetry/api'));

	if (opts) await configure(opts);

	await (init_promise ??= (async () => {
		try {
			const module = await get_hooks();

			set_hooks({
				handle: module.handle || (({ event, resolve }) => resolve(event)),
				handleError:
					module.handleError ||
					(({ kind, error, issues }) => {
						if (kind === 'validation') {
							console.error('Remote function schema validation failed:', issues);
							return;
						}

						if (kind !== 'unknown') {
							// don't log stack traces for 404s etc, it's all internal gubbins
							return;
						}

						let e = error;
						while (e instanceof Error) {
							if (e.stack) {
								console.error(e.stack);
							}
							e = e.cause;
						}

						if (e) {
							console.error(String(e));
						}
					}),
				handleFetch: module.handleFetch || (({ request, fetch }) => fetch(request)),
				reroute: module.reroute || noop
			});

			init_transport(module.transport ?? {});

			if (module.init) {
				await module.init();
			}
		} catch (e) {
			if (__SVELTEKIT_DEV__) {
				set_hooks({
					handle: () => {
						throw e;
					},
					handleError: ({ error }) => console.error(error),
					handleFetch: ({ request, fetch }) => fetch(request),
					reroute: noop
				});
			} else {
				throw e;
			}
		}
	})());
}

/**
 * @param {Request} request
 * @param {import('types').InternalRequestOptions} options
 */
async function respond_to(request, options) {
	const request_state = create_request_state(options);

	const response = await handle(request, request_state);

	if (DEV) {
		const error = decoded_responses.get(response);
		if (error) console.error(fix_stack_trace(error));
	}

	if (request_state.rerouted_url) {
		response.headers.set(REROUTED_URL_HEADER, request_state.rerouted_url);
	}

	return response;
}

/**
 * AsyncLocalStorage does not work in webcontainers, so there `sync_store` is never reset
 * (see `src/exports/internal/server/event.js`) and requests are handled one at a time
 * @param {typeof respond_to} fn
 */
function serialise(fn) {
	/** @type {Promise<void> | null} */
	let current = null;

	/** @type {typeof respond_to} */
	return async (...args) => {
		const { promise, resolve } = /** @type {PromiseWithResolvers<void>} */ (
			Promise.withResolvers()
		);

		const previous = current;
		current = promise;

		await previous;
		return fn(...args).finally(resolve);
	};
}

export const respond = IN_WEBCONTAINER ? serialise(respond_to) : respond_to;

/**
 * The `server` object adapters receive from `builder.generateServerInstance`
 * @param {import('types').SSRManifest} manifest
 * @returns {import('@sveltejs/kit').Server}
 */
export function create_server(manifest) {
	// set now rather than in `init`, since user modules may read the manifest at their top level
	set_manifest(manifest);

	return {
		// adapters get to set `env` and `read`, nothing else
		init: ({ env, read }) => init({ env, read }),
		respond
	};
}

/** @deprecated use the `server` written by `builder.generateServerInstance`, or `init` and `respond` */
export class Server {
	#server;

	/** @param {import('types').SSRManifest} manifest */
	constructor(manifest) {
		this.#server = create_server(manifest);
	}

	/** @param {import('@sveltejs/kit').ServerInitOptions} opts */
	init(opts) {
		return this.#server.init(opts);
	}

	/**
	 * @param {Request} request
	 * @param {import('types').InternalRequestOptions} options
	 */
	respond(request, options) {
		return this.#server.respond(request, options);
	}
}
