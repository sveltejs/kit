/** @import { RemoteLiveQuery, RemoteLiveQueryFunction, RemoteQuery, RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteInternals, MaybePromise, RequestState, RemoteQueryLiveInternals, RemoteQueryBatchInternals, RemoteQueryInternals, RemoteLiveQueryUserFunctionReturnType } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { create_remote_key, stringify, stringify_remote_arg } from '../../../shared.js';
import { prerendering } from '__sveltekit/environment';
import {
	create_validator,
	get_cache,
	get_response,
	run_remote_function,
	run_remote_generator
} from './shared.js';
import { handle_error_and_jsonify } from '../../../server/utils.js';
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import { noop } from '../../../../utils/functions.js';

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

			return create_query_resource(__, payload, state, () =>
				run_remote_function(event, state, false, () => validated_arg, fn)
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

		return create_query_resource(__, payload, state, () =>
			run_remote_function(event, state, false, () => validate(arg), fn)
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
		run_remote_generator(event, state, false, get_input, fn, __.name);

	/**
	 * @param {any} generator
	 * @returns {Promise<any>}
	 */
	const first_value = async (generator) => {
		try {
			const { value, done } = await generator.next();

			if (done) {
				throw new Error(`query.live '${__.name}' did not yield a value`);
			}

			return value;
		} finally {
			await generator.return(undefined);
		}
	};

	/** @type {RemoteQueryLiveInternals} */
	const __ = {
		type: 'query_live',
		id: '',
		name: '',
		run: (event, state, arg) => run(event, state, () => validate(arg)),
		validate,
		bind(payload, validated_arg) {
			const { event, state } = get_request_store();

			return create_live_query_resource(__, payload, state, () =>
				first_value(run(event, state, () => validated_arg))
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

		return create_live_query_resource(__, payload, state, () =>
			first_value(run(event, state, () => validate(arg)))
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

	/** @type {Map<string, { get_validated: () => MaybePromise<any>, resolvers: Array<{resolve: (value: any) => void, reject: (error: any) => void}> }>} */
	let batching = new Map();

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
			const entry = batching.get(payload);

			if (entry) {
				entry.resolvers.push({ resolve, reject });
				return;
			}

			batching.set(payload, {
				get_validated,
				resolvers: [{ resolve, reject }]
			});

			if (batching.size > 1) return;

			setTimeout(async () => {
				const batched = batching;
				batching = new Map();
				const entries = Array.from(batched.values());

				try {
					return await run_remote_function(
						event,
						state,
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
				state,
				false,
				async () => Promise.all(args.map(validate)),
				async (/** @type {any[]} */ input) => {
					const get_result = await fn(input);

					return Promise.all(
						input.map(async (arg, i) => {
							try {
								const data = get_result(arg, i);
								return { type: 'result', data: stringify(data, state.transport) };
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
			const { state } = get_request_store();

			return create_query_resource(__, payload, state, () => enqueue(payload, () => validated_arg));
		}
	};

	/** @type {RemoteQueryFunction<Input, Output> & { __: RemoteQueryBatchInternals }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query.batch '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { state } = get_request_store();
		const payload = stringify_remote_arg(arg, state.transport);

		return create_query_resource(__, payload, state, () =>
			// Collect all the calls to the same query in the same macrotask,
			// then execute them as one backend request.
			enqueue(payload, () => validate(arg))
		);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}

/**
 * @param {RemoteInternals} __
 * @param {string} payload — the stringified raw argument (i.e. the cache key the client will use)
 * @param {RequestState} state
 * @param {() => Promise<any>} fn
 * @returns {RemoteQuery<any>}
 */
function create_query_resource(__, payload, state, fn) {
	/** @type {Promise<any> | null} */
	let promise = null;

	const get_promise = () => {
		return (promise ??= get_response(__, payload, state, fn));
	};

	const populate_hydratable = () => {
		// accessing data properties needs to kick off the work
		// so that it gets seeded in the hydration cache
		// and becomes available on the client
		void (__.id && state.is_in_render && get_promise());
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
			const refresh_context = get_refresh_context(__, 'refresh', payload);
			const is_immediate_refresh = !refresh_context.cache[refresh_context.payload];
			const value = is_immediate_refresh ? get_promise() : fn();
			return update_refresh_value(refresh_context, value, is_immediate_refresh);
		},
		run() {
			// potential TODO: if we want to be able to run queries at the top level of modules / outside of the request context, we could technically remove
			// the requirement that `state` is defined, but that's kind of an annoying change to make, so we're going to wait on that until we have any sort of
			// concrete use case.
			if (!state.is_in_universal_load) {
				throw new Error(
					'On the server, .run() can only be called in universal `load` functions. Anywhere else, just await the query directly'
				);
			}
			return get_response(__, payload, state, fn);
		},
		/** @param {any} value */
		set(value) {
			return update_refresh_value(get_refresh_context(__, 'set', payload), value);
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
 * @param {RequestState} state
 * @param {() => Promise<any>} get_first_value
 * @returns {RemoteLiveQuery<any>}
 */
function create_live_query_resource(__, payload, state, get_first_value) {
	/** @type {Promise<any> | null} */
	let promise = null;

	const get_promise = () => {
		return (promise ??= get_response(__, payload, state, get_first_value));
	};

	const populate_hydratable = () => {
		void (__.id && state.is_in_render && get_promise());
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
			const reconnects = state.remote.reconnects;

			if (!reconnects) {
				throw new Error(
					`Cannot call reconnect on query.live '${__.name}' because it is not executed in the context of a command/form remote function`
				);
			}

			reconnects.set(create_remote_key(__.id, payload), get_promise());
			return Promise.resolve();
		},
		run() {
			throw new Error('Cannot call .run() on a live query on the server');
		},
		/** @type {Promise<any>['then']} */
		then(onfulfilled, onrejected) {
			return get_promise().then(onfulfilled, onrejected);
		},
		get [Symbol.toStringTag]() {
			return 'LiveQueryResource';
		}
	};
}

// Add batch as a property to the query function
Object.defineProperty(query, 'batch', { value: batch, enumerable: true });
Object.defineProperty(query, 'live', { value: live, enumerable: true });

/**
 * @param {RemoteInternals} __
 * @param {'set' | 'refresh'} action
 * @param {string} payload — the stringified raw argument (i.e. the cache key the client will use)
 * @returns {{ __: RemoteInternals; state: any; refreshes: Map<string, Promise<any>>; cache: Record<string, { serialize: boolean; data: any }>; refreshes_key: string; payload: string }}
 */
function get_refresh_context(__, action, payload) {
	const { state } = get_request_store();
	const { refreshes } = state.remote;

	if (!refreshes) {
		const name = __.type === 'query_batch' ? `query.batch '${__.name}'` : `query '${__.name}'`;
		throw new Error(
			`Cannot call ${action} on ${name} because it is not executed in the context of a command/form remote function`
		);
	}

	const cache = get_cache(__, state);
	const refreshes_key = create_remote_key(__.id, payload);

	return { __, state, refreshes, refreshes_key, cache, payload };
}

/**
 * @param {{ __: RemoteInternals; refreshes: Map<string, Promise<any>>; cache: Record<string, { serialize: boolean; data: any }>; refreshes_key: string; payload: string }} context
 * @param {any} value
 * @param {boolean} [is_immediate_refresh=false]
 * @returns {Promise<void>}
 */
function update_refresh_value(
	{ __, refreshes, refreshes_key, cache, payload },
	value,
	is_immediate_refresh = false
) {
	const promise = Promise.resolve(value);

	if (!is_immediate_refresh) {
		cache[payload] = { serialize: true, data: promise };
	}

	if (__.id) {
		refreshes.set(refreshes_key, promise);
	}

	promise.catch(noop);

	// we return an immediately-resolving promise so that the `refresh()` signature is consistent,
	// but it doesn't delay anything if awaited inside a command. this way, people aren't
	// penalised if they do `await q1.refresh(); await q2.refresh()`
	return Promise.resolve();
}
