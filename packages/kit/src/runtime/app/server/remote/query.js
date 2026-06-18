/** @import { RemoteLiveQuery, RemoteLiveQueryFunction, RemoteQuery, RemoteQueryFunction, RequestEvent } from '@sveltejs/kit' */
/** @import { RemoteInternals, MaybePromise, RequestState, RemoteQueryLiveInternals, RemoteQueryBatchInternals, RemoteQueryInternals, RemoteLiveQueryUserFunctionReturnType } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { create_remote_key, stringify_remote_arg } from '../../../shared.js';
import { prerendering } from '$app/env/internal';
import {
	create_validator,
	get_cache,
	get_response,
	run_remote_function,
	run_remote_generator
} from './shared.js';
import { noop } from '../../../../utils/functions.js';
import { SharedIterator } from '../../../../utils/shared-iterator.js';
import { handle_error_and_jsonify } from '../../../server/utils.js';
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';

/**
 * Creates a remote query. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
 *
 * @template Output
 * @overload
 * @param {() => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<void, Output>}
 * @since 2.27
 */
/**
 * Creates a remote query. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
 *
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<Input, Output>}
 * @since 2.27
 */
/**
 * Creates a remote query. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
 *
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<StandardSchemaV1.InferInput<Schema>, Output, StandardSchemaV1.InferOutput<Schema>>}
 * @since 2.27
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(args?: Input) => MaybePromise<Output>} [maybe_fn]
 * @returns {RemoteQueryFunction<Input, Output>}
 * @since 2.27
 */
/*@__NO_SIDE_EFFECTS__*/
export function query(validate_or_fn, maybe_fn) {
	/** @type {(arg?: Input) => Output} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/** @type {RemoteQueryInternals} */
	const __ = {
		type: 'query',
		id: '',
		name: '',
		validate,
		bind(payload, validated_arg) {
			const { event, state } = get_request_store();

			return create_query_resource(__, payload, event, state, () =>
				run_remote_function(
					event,
					{ ...state, is_in_remote_query: true },
					false,
					() => validated_arg,
					fn
				)
			);
		}
	};

	/** @type {RemoteQueryFunction<Input, Output> & { __: RemoteQueryInternals }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();
		const payload = stringify_remote_arg(arg, state.transport);

		return create_query_resource(__, payload, event, state, () =>
			run_remote_function(
				event,
				{ ...state, is_in_remote_query: true },
				false,
				() => validate(arg),
				fn
			)
		);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}

/**
 * Creates a live remote query. When called from the browser, the function will be invoked on the server via a streaming `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.live) for full documentation.
 *
 * @template Output
 * @overload
 * @param {(arg: void) => RemoteLiveQueryUserFunctionReturnType<Output>} fn
 * @returns {RemoteLiveQueryFunction<void, Output>}
 */
/**
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => RemoteLiveQueryUserFunctionReturnType<Output>} fn
 * @returns {RemoteLiveQueryFunction<Input, Output>}
 */
/**
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => RemoteLiveQueryUserFunctionReturnType<Output>} fn
 * @returns {RemoteLiveQueryFunction<StandardSchemaV1.InferInput<Schema>, Output, StandardSchemaV1.InferOutput<Schema>>}
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(args: Input) => RemoteLiveQueryUserFunctionReturnType<Output>} [maybe_fn]
 * @returns {RemoteLiveQueryFunction<Input, Output>}
 */
/*@__NO_SIDE_EFFECTS__*/
function live(validate_or_fn, maybe_fn) {
	/** @type {(arg: Input) => RemoteLiveQueryUserFunctionReturnType<Output>} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/**
	 * @param {any} event
	 * @param {any} state
	 * @param {any} get_input
	 */
	const run = (event, state, get_input) =>
		run_remote_generator(
			event,
			{ ...state, is_in_remote_query: true },
			false,
			get_input,
			fn,
			__.name
		);

	/** @type {RemoteQueryLiveInternals} */
	const __ = {
		type: 'query_live',
		id: '',
		name: '',
		run: (event, state, arg) => run(event, state, () => validate(arg)),
		validate,
		bind(payload, validated_arg) {
			const { event, state } = get_request_store();

			return create_live_query_resource(__, payload, event, state, () =>
				run(event, state, () => validated_arg)
			);
		}
	};

	/** @type {RemoteLiveQueryFunction<Input, Output> & { __: RemoteQueryLiveInternals }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query.live '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();
		const payload = stringify_remote_arg(arg, state.transport);

		return create_live_query_resource(__, payload, event, state, () =>
			run(event, state, () => validate(arg))
		);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}

/**
 * Creates a batch query function that collects multiple calls and executes them in a single request
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.batch) for full documentation.
 *
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(args: Input[]) => MaybePromise<(arg: Input, idx: number) => Output>} fn
 * @returns {RemoteQueryFunction<Input, Output>}
 * @since 2.35
 */
/**
 * Creates a batch query function that collects multiple calls and executes them in a single request
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.batch) for full documentation.
 *
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(args: StandardSchemaV1.InferOutput<Schema>[]) => MaybePromise<(arg: StandardSchemaV1.InferOutput<Schema>, idx: number) => Output>} fn
 * @returns {RemoteQueryFunction<StandardSchemaV1.InferInput<Schema>, Output, StandardSchemaV1.InferOutput<Schema>>}
 * @since 2.35
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(args?: Input[]) => MaybePromise<(arg: Input, idx: number) => Output>} [maybe_fn]
 * @returns {RemoteQueryFunction<Input, Output>}
 * @since 2.35
 */
/*@__NO_SIDE_EFFECTS__*/
function batch(validate_or_fn, maybe_fn) {
	/** @type {(args?: Input[]) => MaybePromise<(arg: Input, idx: number) => Output>} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/**
	 * Enqueues a single call into the current batch (creating one if necessary)
	 * and returns a promise that resolves with the result for this entry.
	 *
	 * @param {string} payload — the stringified raw argument (cache key)
	 * @param {() => MaybePromise<any>} get_validated — produces the validated argument for this entry
	 * @returns {Promise<any>}
	 */
	const enqueue = (payload, get_validated) => {
		const { event, state } = get_request_store();

		return new Promise((resolve, reject) => {
			const batches = (state.remote.batches ??=
				/** @type {NonNullable<typeof state.remote.batches>} */ (new Map()));
			let batched = batches.get(__.id);
			if (!batched) {
				batched = new Map();
				batches.set(__.id, batched);
			}
			const entry = batched.get(payload);

			if (entry) {
				entry.resolvers.push({ resolve, reject });
				return;
			}

			batched.set(payload, {
				get_validated,
				resolvers: [{ resolve, reject }]
			});

			if (batched.size > 1) return;

			setTimeout(async () => {
				batches.delete(__.id);
				const entries = Array.from(batched.values());

				try {
					return await run_remote_function(
						event,
						{ ...state, is_in_remote_query: true },
						false,
						async () => Promise.all(entries.map((entry) => entry.get_validated())),
						async (input) => {
							const get_result = await fn(input);

							for (let i = 0; i < entries.length; i++) {
								try {
									const result = get_result(input[i], i);

									for (const resolver of entries[i].resolvers) {
										resolver.resolve(result);
									}
								} catch (error) {
									for (const resolver of entries[i].resolvers) {
										resolver.reject(error);
									}
								}
							}
						}
					);
				} catch (error) {
					for (const entry of batched.values()) {
						for (const resolver of entry.resolvers) {
							resolver.reject(error);
						}
					}
				}
			}, 0);
		});
	};

	/** @type {RemoteQueryBatchInternals} */
	const __ = {
		type: 'query_batch',
		id: '',
		name: '',
		validate,
		run: async (args, options) => {
			const { event, state } = get_request_store();

			return run_remote_function(
				event,
				{ ...state, is_in_remote_query: true },
				false,
				async () => Promise.all(args.map(validate)),
				async (/** @type {any[]} */ input) => {
					const get_result = await fn(input);

					return Promise.all(
						input.map(async (arg, i) => {
							try {
								const data = get_result(arg, i);
								return { type: 'result', data };
							} catch (error) {
								return {
									type: 'error',
									error: await handle_error_and_jsonify(event, state, options, error),
									status:
										error instanceof HttpError || error instanceof SvelteKitError
											? error.status
											: 500
								};
							}
						})
					);
				}
			);
		},
		bind(payload, validated_arg) {
			const { event, state } = get_request_store();

			return create_query_resource(__, payload, event, state, () =>
				enqueue(payload, () => validated_arg)
			);
		}
	};

	/** @type {RemoteQueryFunction<Input, Output> & { __: RemoteQueryBatchInternals }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query.batch '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();
		const payload = stringify_remote_arg(arg, state.transport);

		return create_query_resource(__, payload, event, state, () =>
			// Collect all the calls to the same query in the same macrotask,
			// then execute them as one backend request.
			enqueue(payload, () => validate(arg))
		);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}

/**
 * Include this value in the returned payload...
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {RemoteInternals} internals
 * @param {string} payload
 * @param {() => Promise<any>} fn
 */
export function refresh(event, state, internals, payload, fn) {
	if (!internals.id) {
		// unless this is a non-exported (i.e. private) query...
		return;
	}

	if (!event.isRemoteRequest) {
		// or this is a no-JS form submission
		return;
	}

	const key = create_remote_key(internals.id, payload);

	// `fn()` is invoked eagerly here, which starts running the query immediately.
	// The resulting promise is normally awaited (and its rejection handled) in
	// `collect_remote_data`, but some code paths (e.g. a command throwing a
	// non-redirect error) never reach that point. Attach a no-op `catch` to the
	// promise so a rejection is always considered handled and can never become an
	// unhandled promise rejection (which crashes the process on modern Node).
	// We still store the original promise so `collect_remote_data` can serialize
	// either its value or its error as before.
	const promise = fn();
	promise.catch(() => {});

	(state.remote.explicit ??= new Map()).set(key, {
		internals,
		promise
	});
}

/**
 * @param {RemoteInternals} __
 * @param {string} payload — the stringified raw argument (i.e. the cache key the client will use)
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {() => Promise<any>} fn
 * @returns {RemoteQuery<any>}
 */
function create_query_resource(__, payload, event, state, fn) {
	/** @type {Promise<any> | null} */
	let promise = null;

	const get_promise = () => {
		return (promise ??= get_response(__, payload, state, fn));
	};

	const populate_hydratable = () => {
		// accessing data properties needs to kick off the work
		// so that it gets seeded in the hydration cache
		// and becomes available on the client
		if (__.id && state.is_in_render) {
			// swallow rejections so they don't crash the server — the error is
			// serialized into the response and surfaced on the client instead
			get_promise().catch(noop);
		}
	};

	return {
		/** @type {Promise<any>['catch']} */
		catch(onrejected) {
			return get_promise().catch(onrejected);
		},
		get current() {
			populate_hydratable();
			return undefined;
		},
		get error() {
			populate_hydratable();
			return undefined;
		},
		/** @type {Promise<any>['finally']} */
		finally(onfinally) {
			return get_promise().finally(onfinally);
		},
		get loading() {
			populate_hydratable();
			return true;
		},
		get ready() {
			populate_hydratable();
			return false;
		},
		refresh() {
			promise = null;
			delete get_cache(__, state)[payload];

			refresh(event, state, __, payload, get_promise);

			return Promise.resolve();
		},
		/** @param {any} value */
		set(value) {
			const p = (promise = Promise.resolve(value));
			get_cache(__, state)[payload] = p;

			refresh(event, state, __, payload, () => p);
		},
		// TODO 3.0 remove this
		// @ts-expect-error This method no longer exists
		run() {
			throw new Error(
				`\`myQuery().run()\` has been removed — please replace it with \`myQuery()\`. See https://github.com/sveltejs/kit/pull/15779 for more details`
			);
		},
		/** @type {Promise<any>['then']} */
		then(onfulfilled, onrejected) {
			return get_promise().then(onfulfilled, onrejected);
		},
		withOverride() {
			throw new Error(`Cannot call '${__.name}.withOverride()' on the server`);
		},
		get [Symbol.toStringTag]() {
			return 'QueryResource';
		}
	};
}

/**
 * @param {RemoteQueryLiveInternals} __
 * @param {string} payload — the stringified raw argument (i.e. the cache key the client will use)
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {() => AsyncGenerator<any, void, void>} get_generator
 * @returns {RemoteLiveQuery<any>}
 */
function create_live_query_resource(__, payload, event, state, get_generator) {
	/** @type {Promise<any> | null} */
	let promise = null;

	const get_first_value = async () => {
		for await (const value of get_generator()) {
			return value;
		}
		throw new Error(`query.live '${__.name}' did not yield a value`);
	};

	const get_promise = () => {
		return (promise ??= get_response(__, payload, state, get_first_value));
	};

	const populate_hydratable = () => {
		if (__.id && state.is_in_render) {
			// swallow rejections so they don't crash the server — the error is
			// serialized into the response and surfaced on the client instead
			get_promise().catch(noop);
		}
	};

	return {
		/** @type {Promise<any>['catch']} */
		catch(onrejected) {
			return get_promise().catch(onrejected);
		},
		get current() {
			populate_hydratable();
			return undefined;
		},
		get error() {
			populate_hydratable();
			return undefined;
		},
		/** @type {Promise<any>['finally']} */
		finally(onfinally) {
			return get_promise().finally(onfinally);
		},
		get done() {
			populate_hydratable();
			return false;
		},
		get loading() {
			populate_hydratable();
			return true;
		},
		get ready() {
			populate_hydratable();
			return false;
		},
		get connected() {
			populate_hydratable();
			return false;
		},
		reconnect() {
			promise = null;
			delete get_cache(__, state)[payload];

			refresh(event, state, __, payload, get_promise);

			return Promise.resolve();
		},
		/** @ts-expect-error This method no longer exists */
		run() {
			throw new Error(
				'`.run()` has been removed from live queries. Use `for await (const value of liveQuery())` instead.'
			);
		},
		/** @type {Promise<any>['then']} */
		then(onfulfilled, onrejected) {
			return get_promise().then(onfulfilled, onrejected);
		},
		[Symbol.asyncIterator]() {
			const key = create_remote_key(__.id, payload);
			const cache = (state.remote.live_iterators ??= new Map());
			let cached = cache.get(key);
			if (!cached) {
				cached = create_shared_live_iterator(event.request.signal, get_generator);
				cache.set(key, cached);
			}
			return cached.subscribe();
		},
		get [Symbol.toStringTag]() {
			return 'LiveQueryResource';
		}
	};
}

/**
 * Wraps a lazily-created live-query generator so that multiple `for await`
 * consumers within the same request share one underlying iteration. The first
 * subscriber starts the generator; values are broadcast to all subscribers
 * via a `SharedIterator`. When the last subscriber unsubscribes, the generator
 * is closed via `generator.return(undefined)`.
 *
 * If `signal` aborts (typically because the client has disconnected), the
 * pump is torn down and any in-flight `next()` calls on consumer iterators
 * resolve with `{ done: true }`, so suspended `for await` loops unwind
 * cleanly rather than leaking.
 *
 * @param {AbortSignal} signal
 * @param {() => AsyncGenerator<any, void, void>} get_generator
 */
function create_shared_live_iterator(signal, get_generator) {
	return new SharedIterator((instance) => {
		// Don't bother starting the pump if the request has already been
		// aborted between cache creation and first subscription.
		if (signal.aborted) {
			instance.done();
			return noop;
		}

		const generator = get_generator();

		// Set to `true` when we deliberately close the generator (because every
		// subscriber has unsubscribed, or the request was aborted). The pump's
		// `generator.next()` will reject as a result; we use this flag to swallow that
		// abort error rather than surfacing it through `instance.fail()`.
		let aborted = false;

		const close = () => {
			aborted = true;
			void generator.return().catch(noop);
		};

		// On request abort, tear down the pump and notify subscribers. `done()` is
		// used (rather than `fail()`) because an aborted request is a normal
		// termination — there's no error to surface to user code that's already
		// been disconnected from the client.
		signal.addEventListener('abort', () => (close(), instance.done()), { once: true });

		void (async () => {
			try {
				while (true) {
					const result = await generator.next();
					if (result.done) {
						instance.done();
						return;
					}
					instance.push(result.value);
				}
			} catch (error) {
				if (!aborted) instance.fail(error);
			} finally {
				close();
			}
		})();

		return close;
	});
}

// Add batch as a property to the query function
Object.defineProperty(query, 'batch', { value: batch, enumerable: true });
Object.defineProperty(query, 'live', { value: live, enumerable: true });
