import { noop } from '../../utils/functions.js';
import { IN_WEBCONTAINER } from './constants.js';
import { respond } from './respond.js';
import { options, get_hooks } from '__SERVER__/internal.js';
import { set_read_implementation, set_manifest } from './internal.js';
import { set_env } from '__sveltekit/env';
import { set_app } from './app.js';
import { SvelteKitError } from '@sveltejs/kit/internal';

/** @type {Promise<any>} */
let init_promise;

/** @type {Promise<void> | null} */
let current = null;

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
				} else {
					return new ReadableStream({
						async start(controller) {
							try {
								const stream = await Promise.resolve(result);
								if (!stream) {
									controller.close();
									return;
								}

								const reader = stream.getReader();

								while (true) {
									const { done, value } = await reader.read();
									if (done) break;
									controller.enqueue(value);
								}

								controller.close();
							} catch (error) {
								controller.error(error);
							}
						}
					});
				}
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
					handleError: (args) => {
						/** @type {string} */
						let message = '';
						let stack = '';

						if (!module.handleError) {
							if (args.error instanceof SvelteKitError) {
								// don't log stack traces for 404s etc, it's all internal gubbins
								return;
							}

							let e = args.error;
							while (e instanceof Error) {
								if (__SVELTEKIT_DEV__) {
									message ||= e.message;
									if (e.stack) stack += e.stack;
								}

								if (e.stack) {
									console.error(e.stack);
								}
								e = e.cause;
							}

							if (e) {
								const original_message = String(e);
								console.error(original_message);
								if (__SVELTEKIT_DEV__ && original_message) message = original_message;
							}
						} else if (args.error instanceof Error) {
							message = args.error.message;
							stack = args.error.stack ?? '';
						}

						if (__SVELTEKIT_DEV__ && message) {
							import.meta.hot?.send('vite:error', {
								type: 'error',
								err: {
									message,
									stack: stack.replace(`Error: ${message}\n`, '')
								}
							});
						}

						if (module.handleError) {
							return module.handleError(args);
						}
					},
					handleFetch: module.handleFetch || (({ request, fetch }) => fetch(request)),
					handleValidationError:
						module.handleValidationError ||
						(({ issues }) => {
							console.error('Remote function schema validation failed:', issues);
							return { message: 'Bad Request', status: 400 };
						}),
					reroute: module.reroute || noop,
					transport: module.transport || {}
				};

				set_app({
					decoders: module.transport
						? Object.fromEntries(Object.entries(module.transport).map(([k, v]) => [k, v.decode]))
						: {}
				});

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
						reroute: noop,
						transport: {}
					};

					set_app({
						decoders: {}
					});
				} else {
					throw e;
				}
			}
		})());
	}

	/**
	 * @param {Request} request
	 * @param {import('types').RequestOptions} options
	 */
	respond(request, options) {
		return respond(request, this.#options, this.#manifest, {
			...options,
			error: false,
			depth: 0
		});
	}
}
