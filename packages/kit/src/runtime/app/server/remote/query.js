/** @import { RemoteLiveQuery, RemoteLiveQueryFunction, RemoteQuery, RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteInternals, MaybePromise, RequestState, RemoteQueryLiveInternals, RemoteQueryBatchInternals, RemoteQueryInternals } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { create_remote_key, stringify, stringify_remote_arg } from '../../../shared.js';
import { prerendering } from '__sveltekit/environment';
import { create_validator, get_cache, get_response, run_remote_function } from './shared.js';
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
 * @returns {RemoteQueryFunction<StandardSchemaV1.InferInput<Schema>, Output>}
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
	const __ = { type: 'query', id: '', name: '', validate };

	/** @type {RemoteQueryFunction<Input, Output> & { __: RemoteQueryInternals }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();
		// if the user got this argument from `requested(query)`, it will have already passed validation
		const is_validated = is_validated_argument(__, state, arg);

		return create_query_resource(__, arg, state, () =>
			run_remote_function(event, state, false, () => (is_validated ? arg : validate(arg)), fn)
		);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}

/**
 * @param {RemoteQueryInternals} __
 * @param {RequestState} state
 * @param {any} arg
 */
function is_validated_argument(__, state, arg) {
	return state.remote.validated?.get(__.id)?.has(arg) ?? false;
}

/**
 * @param {RemoteQueryInternals | RemoteQueryLiveInternals} __
 * @param {RequestState} state
 * @param {any} arg
 */
export function mark_argument_validated(__, state, arg) {
	const validated = (state.remote.validated ??= new Map());
	let validated_args = validated.get(__.id);

	if (!validated_args) {
		validated_args = new Set();
		validated.set(__.id, validated_args);
	}

	validated_args.add(arg);
	return arg;
}

/**
 * Creates a live remote query. When called from the browser, the function will be invoked on the server via a streaming `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.live) for full documentation.
 *
 * @template Output
 * @overload
 * @param {(arg: void) => MaybePromise<Generator<Output> | AsyncIterator<Output> | AsyncIterable<Output>>} fn
 * @returns {RemoteLiveQueryFunction<void, Output>}
 */
/**
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => MaybePromise<Generator<Output> | AsyncIterator<Output> | AsyncIterable<Output>>} fn
 * @returns {RemoteLiveQueryFunction<Input, Output>}
 */
/**
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Generator<Output> | AsyncIterator<Output> | AsyncIterable<Output>>} fn
 * @returns {RemoteLiveQueryFunction<StandardSchemaV1.InferInput<Schema>, Output>}
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(args: Input) => MaybePromise<Generator<Output> | AsyncIterator<Output> | AsyncIterable<Output>>} [maybe_fn]
 * @returns {RemoteLiveQueryFunction<Input, Output>}
 */
/*@__NO_SIDE_EFFECTS__*/
function live(validate_or_fn, maybe_fn) {
	/** @type {(arg: Input) => MaybePromise<Generator<Output> | AsyncIterator<Output> | AsyncIterable<Output>>} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/**
	 * @param {any} event
	 * @param {any} state
	 * @param {any} arg
	 */
	const run = async (event, state, arg) => {
		return await run_remote_function(
			event,
			state,
			false,
			() => validate(arg),
			async (input) => to_async_iterator(await fn(input), __.name)
		);
	};

	/** @type {RemoteQueryLiveInternals} */
	const __ = { type: 'query_live', id: '', name: '', run, validate };

	/** @type {RemoteLiveQueryFunction<Input, Output> & { __: RemoteQueryLiveInternals }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query.live '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();

		return create_live_query_resource(
			__,
			arg,
			state,
			async () => {
				const iterator = await run(event, state, arg);

				try {
					const { value, done } = await iterator.next();

					if (done) {
						throw new Error(`query.live '${__.name}' did not yield a value`);
					}

					return value;
				} finally {
					await iterator.return?.();
				}
			},
			async () => run(event, state, arg)
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
 * @returns {RemoteQueryFunction<StandardSchemaV1.InferInput<Schema>, Output>}
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

	/** @type {RemoteQueryBatchInternals} */
	const __ = {
		type: 'query_batch',
		id: '',
		name: '',
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
		}
	};

	/** @type {Map<string, { arg: any, resolvers: Array<{resolve: (value: any) => void, reject: (error: any) => void}> }>} */
	let batching = new Map();

	/** @type {RemoteQueryFunction<Input, Output> & { __: RemoteQueryBatchInternals }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query.batch '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();

		return create_query_resource(__, arg, state, () => {
			// Collect all the calls to the same query in the same macrotask,
			// then execute them as one backend request.
			return new Promise((resolve, reject) => {
				const key = stringify_remote_arg(arg, state.transport);
				const entry = batching.get(key);

				if (entry) {
					entry.resolvers.push({ resolve, reject });
					return;
				}

				batching.set(key, {
					arg,
					resolvers: [{ resolve, reject }]
				});

				if (batching.size > 1) return;

				setTimeout(async () => {
					const batched = batching;
					batching = new Map();
					const entries = Array.from(batched.values());
					const args = entries.map((entry) => entry.arg);

					try {
						return await run_remote_function(
							event,
							state,
							false,
							async () => Promise.all(args.map(validate)),
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
		});
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}

/**
 * @param {RemoteInternals} __
 * @param {any} arg
 * @param {RequestState} state
 * @param {() => Promise<any>} fn
 * @returns {RemoteQuery<any>}
 */
function create_query_resource(__, arg, state, fn) {
	/** @type {Promise<any> | null} */
	let promise = null;

	const get_promise = () => {
		return (promise ??= get_response(__, arg, state, fn));
	};

	return {
		/** @type {Promise<any>['catch']} */
		catch(onrejected) {
			return get_promise().catch(onrejected);
		},
		current: undefined,
		error: undefined,
		/** @type {Promise<any>['finally']} */
		finally(onfinally) {
			return get_promise().finally(onfinally);
		},
		loading: true,
		ready: false,
		refresh() {
			const refresh_context = get_refresh_context(__, 'refresh', arg);
			const is_immediate_refresh = !refresh_context.cache[refresh_context.cache_key];
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
			return get_response(__, arg, state, fn);
		},
		/** @param {any} value */
		set(value) {
			return update_refresh_value(get_refresh_context(__, 'set', arg), value);
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
 * @param {any} arg
 * @param {RequestState} state
 * @param {() => Promise<any>} get_first_value
 * @param {() => MaybePromise<AsyncIterator<any>>} get_iterator
 * @returns {RemoteLiveQuery<any>}
 */
function create_live_query_resource(__, arg, state, get_first_value, get_iterator) {
	/** @type {Promise<any> | null} */
	let promise = null;

	const get_promise = () => {
		return (promise ??= get_response(__, arg, state, get_first_value));
	};

	return {
		/** @type {Promise<any>['catch']} */
		catch(onrejected) {
			return get_promise().catch(onrejected);
		},
		current: undefined,
		error: undefined,
		/** @type {Promise<any>['finally']} */
		finally(onfinally) {
			return get_promise().finally(onfinally);
		},
		completed: false,
		loading: true,
		ready: false,
		connected: false,
		reconnect() {
			const reconnects = state.remote.reconnects;

			if (!reconnects) {
				throw new Error(
					`Cannot call reconnect on query.live '${__.name}' because it is not executed in the context of a command/form remote function`
				);
			}

			reconnects.add(create_remote_key(__.id, stringify_remote_arg(arg, state.transport)));
		},
		async run() {
			if (!state.is_in_universal_load) {
				throw new Error(
					'On the server, .run() can only be called in universal `load` functions. Anywhere else, just await the query directly'
				);
			}

			return get_iterator();
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
 * @template T
 * @param {Generator<T> | AsyncIterator<T> | AsyncIterable<T>} source
 * @param {string} name
 * @returns {AsyncIterator<T>}
 */
function to_async_iterator(source, name) {
	const maybe = /** @type {any} */ (source);

	if (maybe && typeof maybe[Symbol.asyncIterator] === 'function') {
		return maybe[Symbol.asyncIterator]();
	}

	if (maybe && typeof maybe.next === 'function') {
		return maybe;
	}

	throw new Error(`query.live '${name}' must return an AsyncIterator or AsyncIterable`);
}

/**
 * @param {RemoteInternals} __
 * @param {'set' | 'refresh'} action
 * @param {any} [arg]
 * @returns {{ __: RemoteInternals; state: any; refreshes: Map<string, Promise<any>>; cache: Record<string, { serialize: boolean; data: any }>; refreshes_key: string; cache_key: string }}
 */
function get_refresh_context(__, action, arg) {
	const { state } = get_request_store();
	const { refreshes } = state.remote;

	if (!refreshes) {
		const name = __.type === 'query_batch' ? `query.batch '${__.name}'` : `query '${__.name}'`;
		throw new Error(
			`Cannot call ${action} on ${name} because it is not executed in the context of a command/form remote function`
		);
	}

	const cache = get_cache(__, state);
	const cache_key = stringify_remote_arg(arg, state.transport);
	const refreshes_key = create_remote_key(__.id, cache_key);

	return { __, state, refreshes, refreshes_key, cache, cache_key };
}

/**
 * @param {{ __: RemoteInternals; refreshes: Map<string, Promise<any>>; cache: Record<string, { serialize: boolean; data: any }>; refreshes_key: string; cache_key: string }} context
 * @param {any} value
 * @param {boolean} [is_immediate_refresh=false]
 * @returns {Promise<void>}
 */
function update_refresh_value(
	{ __, refreshes, refreshes_key, cache, cache_key },
	value,
	is_immediate_refresh = false
) {
	const promise = Promise.resolve(value);

	if (!is_immediate_refresh) {
		cache[cache_key] = { serialize: true, data: promise };
	}

	if (__.id) {
		refreshes.set(refreshes_key, promise);
	}

	return promise.then(
		() => {},
		() => {}
	);
}
