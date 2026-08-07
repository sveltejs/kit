import { noop } from '../../utils/functions.js';
import { IN_WEBCONTAINER } from './constants.js';
import { respond } from './respond.js';
import { create_request_state } from './state.js';
import { options, get_hooks } from '__SERVER__/internal.js';
import { set_read_implementation, set_manifest, fix_stack_trace } from './internal.js';
import { set_env } from '__sveltekit/env';
import { SvelteKitError } from '@sveltejs/kit/internal';
import { DEV } from 'esm-env';
import { init_transport } from '#app/internal/transport';

/** @type {Promise<any>} */
let init_promise;

/** @type {Promise<void> | null} */
let current = null;

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

export class Server {
	/** @type {import('types').SSROptions} */
	#options;

	/** @type {import('@sveltejs/kit').SSRManifest} */
	#manifest;

	/** @param {import('@sveltejs/kit').SSRManifest} manifest */
	constructor(manifest) {
		/** @type {import('types').SSROptions} */
		this.#options = options;
		this.#manifest = manifest;

		// Since AsyncLocalStorage is not working in webcontainers, we don't reset `sync_store`
		// in `src/exports/internal/server/event.js` and handle only one request at a time.
		if (IN_WEBCONTAINER) {
			const respond = this.respond.bind(this);

			/** @type {typeof respond} */
			this.respond = async (...args) => {
				const { promise, resolve } = /** @type {PromiseWithResolvers<void>} */ (
					Promise.withResolvers()
				);

				const previous = current;
				current = promise;

				await previous;
				return respond(...args).finally(resolve);
			};
		}

		set_manifest(manifest);
	}

	/**
	 * @param {import('@sveltejs/kit').ServerInitOptions} opts
	 */
	async init({ env, read }) {
		// Take care: Some adapters may have to call `Server.init` per-request to set env vars,
		// so anything that shouldn't be rerun should be wrapped in an `if` block to make sure it hasn't
		// been done already.

		// set env, in case it's used in initialisation
		set_env(env);

		if (read) {
			// Wrap the read function to handle MaybePromise<ReadableStream>
			// and ensure the public API stays synchronous
			/** @param {string} file */
			const wrapped_read = (file) => {
				const result = read(file);
				if (result instanceof ReadableStream) {
					return result;
				}

				// TODO remove the cast once TypeScript's lib includes `ReadableStream.from`
				return /** @type {ReadableStream} */ (
					/** @type {any} */ (ReadableStream).from(
						(async function* () {
							const stream = await result;
							if (stream) yield* stream;
						})()
					)
				);
			};

			set_read_implementation(wrapped_read);
		}

		// During dev and for some adapters this function might be called in quick succession,
		// so we need to make sure we're not invoking this logic (most notably the init hook) multiple times
		await (init_promise ??= (async () => {
			try {
				const module = await get_hooks();

				this.#options.hooks = {
					handle: module.handle || (({ event, resolve }) => resolve(event)),
					handleError:
						module.handleError ||
						(({ error }) => {
							if (error instanceof SvelteKitError) {
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
					handleValidationError:
						module.handleValidationError ||
						(({ issues }) => {
							console.error('Remote function schema validation failed:', issues);
							return { message: 'Bad Request', status: 400 };
						}),
					reroute: module.reroute || noop
				};

				init_transport(module.transport ?? {});

				if (module.init) {
					await module.init();
				}
			} catch (e) {
				if (__SVELTEKIT_DEV__) {
					this.#options.hooks = {
						handle: () => {
							throw e;
						},
						handleError: ({ error }) => console.error(error),
						handleFetch: ({ request, fetch }) => fetch(request),
						handleValidationError: () => {
							return { message: 'Bad Request' };
						},
						reroute: noop
					};
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
	async respond(request, options) {
		const response = await respond(
			request,
			this.#options,
			this.#manifest,
			create_request_state(options, this.#options.hooks)
		);

		if (DEV) {
			const error = decoded_responses.get(response);
			if (error) console.error(fix_stack_trace(error));
		}

		return response;
	}
}
