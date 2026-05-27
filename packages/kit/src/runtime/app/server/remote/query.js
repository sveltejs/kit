/** @import { RemoteLiveQuery, RemoteLiveQueryFunction, RemoteQuery, RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteInternals, MaybePromise, RequestState, RemoteQueryLiveInternals, RemoteQueryBatchInternals, RemoteQueryFanOutInternals, RemoteQueryInternals, RemoteLiveQueryUserFunctionReturnType } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import {
	create_remote_key,
	stringify,
	stringify_remote_arg,
	unfriendly_hydratable
} from '../../../shared.js';
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
import { SharedIterator } from '../../../../utils/shared-iterator.js';

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

	/** @type {RemoteQueryLiveInternals} */
	const __ = {
		type: 'query_live',
		id: '',
		name: '',
		run: (event, state, arg) => run(event, state, () => validate(arg)),
		validate,
		bind(payload, validated_arg) {
			const { event, state } = get_request_store();

			return create_live_query_resource(__, payload, state, event.request.signal, () =>
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

		return create_live_query_resource(__, payload, state, event.request.signal, () =>
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
 * Creates a fan-out query that turns one server call into an array of per-item
 * query resources, alongside any list-level metadata the user wants to
 * pass through.
 *
 * The user function returns `{ rows: Array<[ItemArg, Item]>, ...meta }`. The
 * `rows` field is fanned out: each tuple's `Item` warms the companion item
 * query's cache and becomes a `RemoteQuery<Item>` on the consumer side. Any
 * other fields on the returned object pass through unchanged, so paginated
 * APIs can include cursors, totals, has-next-page flags, and so on.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.fanOut) for full documentation.
 *
 * @template ItemArg
 * @template Item
 * @template {Record<string, any>} Result
 * @overload
 * @param {RemoteQueryFunction<ItemArg, Item, any>} item_query
 * @param {() => MaybePromise<Result & { rows: Array<[ItemArg, Item]> }>} fn
 * @returns {RemoteQueryFunction<void, Omit<Result, 'rows'> & { rows: Array<RemoteQuery<Item>> }>}
 */
/**
 * Creates a fan-out query that turns one server call into an array of per-item
 * query resources, alongside any list-level metadata the user wants to
 * pass through.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.fanOut) for full documentation.
 *
 * @template ItemArg
 * @template Item
 * @template Input
 * @template {Record<string, any>} Result
 * @overload
 * @param {RemoteQueryFunction<ItemArg, Item, any>} item_query
 * @param {'unchecked'} validate
 * @param {(arg: Input) => MaybePromise<Result & { rows: Array<[ItemArg, Item]> }>} fn
 * @returns {RemoteQueryFunction<Input, Omit<Result, 'rows'> & { rows: Array<RemoteQuery<Item>> }>}
 */
/**
 * Creates a fan-out query that turns one server call into an array of per-item
 * query resources, alongside any list-level metadata the user wants to
 * pass through.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.fanOut) for full documentation.
 *
 * @template ItemArg
 * @template Item
 * @template {StandardSchemaV1} Schema
 * @template {Record<string, any>} Result
 * @overload
 * @param {RemoteQueryFunction<ItemArg, Item, any>} item_query
 * @param {Schema} schema
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Result & { rows: Array<[ItemArg, Item]> }>} fn
 * @returns {RemoteQueryFunction<StandardSchemaV1.InferInput<Schema>, Omit<Result, 'rows'> & { rows: Array<RemoteQuery<Item>> }, StandardSchemaV1.InferOutput<Schema>>}
 */
/**
 * @template ItemArg
 * @template Item
 * @template Input
 * @param {RemoteQueryFunction<ItemArg, Item, any>} item_query
 * @param {any} validate_or_fn
 * @param {(arg?: Input) => MaybePromise<{ rows: Array<[ItemArg, Item]> } & Record<string, any>>} [maybe_fn]
 * @returns {RemoteQueryFunction<Input, { rows: Array<RemoteQuery<Item>> } & Record<string, any>>}
 */
/*@__NO_SIDE_EFFECTS__*/
function fan_out(item_query, validate_or_fn, maybe_fn) {
	const item_internals = /** @type {RemoteQueryInternals | undefined} */ (
		/** @type {any} */ (item_query)?.__
	);

	if (!item_internals || item_internals.type !== 'query') {
		throw new Error(
			"query.fanOut's first argument must be a query function created with `query(...)`"
		);
	}

	/** @type {(arg?: Input) => MaybePromise<{ rows: Array<[ItemArg, Item]> } & Record<string, any>>} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/**
	 * Invoke the user function and process its result:
	 *   1. Pull `rows` out of the returned object — the rest is metadata
	 *      and rides through unchanged.
	 *   2. For each `[item_arg, data]` tuple:
	 *      a. Validate `item_arg` through the companion item query's
	 *         validator. A failure becomes a per-row error entry; other
	 *         rows still succeed.
	 *      b. Warm the per-request cache for the item query so subsequent
	 *         `item_query(arg)` calls within this render reuse this value
	 *         rather than re-running the user function.
	 *      c. Build an entry describing the row's outcome, including a
	 *         jsonified error when `options` is supplied (i.e. we're
	 *         producing a wire response). When `options` is missing (the
	 *         SSR render path), errors get a minimal `{ message }`
	 *         placeholder.
	 *
	 * @param {Input | undefined} input
	 * @param {any} options
	 * @returns {Promise<{ items: Array<FanOutEntry>, meta: Record<string, any> }>}
	 */
	const process_user_result = async (input, options) => {
		const { event, state } = get_request_store();
		const item_cache = get_cache(item_internals, state);

		const result = await fn(input);
		if (result === null || typeof result !== 'object' || !Array.isArray(result.rows)) {
			throw new Error(
				`query.fanOut '${__.name}' must return an object with a \`rows\` array of [arg, item] tuples`
			);
		}

		// Shallow-copy without `rows` — everything else rides through as
		// list-level metadata (cursors, totals, etc).
		const { rows, ...meta } = result;
		const tuples = /** @type {Array<[ItemArg, Item]>} */ (rows);

		const items = await Promise.all(
			tuples.map(async ([item_arg, data]) => {
				try {
					const validated_item_arg = await item_internals.validate(item_arg);
					const item_payload = stringify_remote_arg(validated_item_arg, state.transport);

					// Warm the per-request cache. Subsequent `item_query(arg)` calls
					// within this render look up `state.remote.data` keyed by
					// `(item_internals, item_payload)` and will reuse this value.
					// `serialize: true` ensures the value is included in the hydration
					// payload so the client can avoid a follow-up fetch.
					item_cache[item_payload] = { serialize: true, data: Promise.resolve(data) };

					return {
						type: /** @type {const} */ ('result'),
						arg: validated_item_arg,
						payload: item_payload,
						data
					};
				} catch (error) {
					// We don't have a validated item_arg, so we use the raw one for both
					// `arg` (sent to the client) and `payload` (cache key). This is fine
					// for error entries: if the client subsequently calls `item_query(arg)`
					// with the same raw arg, validation will fail in the same way.
					const item_payload = stringify_remote_arg(item_arg, state.transport);
					const status =
						error instanceof HttpError || error instanceof SvelteKitError ? error.status : 500;

					// Poison the item-query cache entry so awaiting a sibling
					// `item_query(arg)` call in the same render produces the same
					// error rather than silently re-running the user function.
					const rejected = Promise.reject(error);
					rejected.catch(noop);
					item_cache[item_payload] = { serialize: false, data: rejected };

					const jsonified = options
						? await handle_error_and_jsonify(event, state, options, error)
						: /** @type {any} */ ({
								message: error instanceof Error ? error.message : 'Unknown Error'
							});

					return {
						type: /** @type {const} */ ('error'),
						arg: item_arg,
						payload: item_payload,
						error: jsonified,
						status
					};
				}
			})
		);

		return { items, meta };
	};

	/** @type {RemoteQueryFanOutInternals} */
	const __ = {
		type: 'query_fan_out',
		id: '',
		name: '',
		validate,
		run: async (arg, options) => {
			const { event, state } = get_request_store();

			return run_remote_function(
				event,
				state,
				false,
				() => validate(arg),
				async (input) => {
					const { items, meta } = await process_user_result(input, options);
					return { item_query_id: item_internals.id, items, meta };
				}
			);
		},
		bind(payload, validated_arg) {
			const { event, state } = get_request_store();

			return create_fan_out_resource(__, item_internals, payload, state, () =>
				run_remote_function(
					event,
					state,
					false,
					() => validated_arg,
					async (input) => process_user_result(input, /* options */ undefined)
				)
			);
		}
	};

	/** @type {RemoteQueryFunction<Input, { rows: Array<RemoteQuery<Item>> } & Record<string, any>> & { __: RemoteQueryFanOutInternals }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query.fanOut '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();
		const payload = stringify_remote_arg(arg, state.transport);

		return create_fan_out_resource(__, item_internals, payload, state, () =>
			run_remote_function(
				event,
				state,
				false,
				() => validate(arg),
				async (input) => process_user_result(input, /* options */ undefined)
			)
		);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}

/**
 * @typedef {| { type: 'result'; arg: any; payload: string; data: any }
 *           | { type: 'error'; arg: any; payload: string; error: any; status: number }} FanOutEntry
 */

/**
 * @typedef {{ items: Array<FanOutEntry>, meta: Record<string, any> }} FanOutInternalResult
 */

/**
 * Like `create_query_resource`, but specialized for `query.fanOut`:
 *
 *   - The cached value is the internal `{ items, meta }` shape, so repeat
 *     calls to `wrapper(arg)` within the same render reuse it.
 *   - Hydration seeds the wire format `{ item_query_id, items, meta }`
 *     under `__.id + payload`, not the unserializable array of resources.
 *     The client stub reads this on first call, unwraps it into per-item
 *     `QueryProxy` instances merged with `meta`, and never has to issue
 *     an extra HTTP request.
 *   - Awaiting the resource resolves to `{ rows: Array<RemoteQuery<Item>>, ...meta }`
 *     for user code, built by `bind`-ing each item entry to the companion
 *     item query (whose per-request cache was warmed) and spreading
 *     the metadata.
 *
 * @template Item
 * @param {RemoteQueryFanOutInternals} __
 * @param {RemoteQueryInternals} item_internals
 * @param {string} payload — the stringified raw argument (i.e. the cache key the client will use)
 * @param {RequestState} state
 * @param {() => Promise<any>} fn
 * @returns {RemoteQuery<{ rows: Array<RemoteQuery<Item>> } & Record<string, any>>}
 */
function create_fan_out_resource(__, item_internals, payload, state, fn) {
	/** @type {Promise<FanOutInternalResult> | null} */
	let internal_promise = null;

	/** @type {Promise<{ rows: Array<RemoteQuery<Item>> } & Record<string, any>> | null} */
	let resolved_promise = null;

	const get_internal_promise = () => {
		if (internal_promise) return internal_promise;

		// Cache on `state.remote.data` so that a second `wrapper(arg)` in
		// the same render reuses the same { items, meta } payload, and so
		// that the hydration handoff serializes a known-shape wire format
		// (not the array of resources, which is not serializable).
		const cache = get_cache(__, state);
		const existing = cache[payload];
		if (existing) {
			internal_promise = /** @type {Promise<FanOutInternalResult>} */ (
				Promise.resolve(existing.data)
			);
		} else {
			internal_promise = fn();
			cache[payload] = { serialize: true, data: internal_promise };
		}

		// Seed the hydration cache under our own (id, payload). The client
		// stub looks this up in `query_responses` and skips the HTTP fetch.
		if (state.is_in_render && __.id) {
			const remote_key = create_remote_key(__.id, payload);
			internal_promise
				.then(({ items, meta }) => {
					void unfriendly_hydratable(remote_key, () =>
						stringify({ item_query_id: item_internals.id, items, meta }, state.transport)
					);
				})
				.catch(noop);
		}

		return internal_promise;
	};

	const get_resolved_promise = () => {
		return (resolved_promise ??= get_internal_promise().then(({ items, meta }) => ({
			...meta,
			rows: items.map(
				(entry) => /** @type {RemoteQuery<Item>} */ (item_internals.bind(entry.payload, entry.arg))
			)
		})));
	};

	const populate_hydratable = () => {
		// Accessing the data accessors must kick off the work so that the
		// value gets seeded into the hydration cache and becomes available
		// on the client without an extra round-trip.
		void (__.id && state.is_in_render && get_resolved_promise());
	};

	return /** @type {RemoteQuery<{ rows: Array<RemoteQuery<Item>> } & Record<string, any>>} */ (
		/** @type {unknown} */ ({
			/** @type {Promise<any>['catch']} */
			catch(onrejected) {
				return get_resolved_promise().catch(onrejected);
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
				return get_resolved_promise().finally(onfinally);
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
				const { event } = get_request_store();
				if (!event.isRemoteRequest) return Promise.resolve();
				const refresh_context = get_refresh_context(__, 'refresh', payload);
				const is_immediate_refresh = !refresh_context.cache[refresh_context.payload];
				const value = is_immediate_refresh ? get_internal_promise() : fn();
				return update_refresh_value(refresh_context, value, is_immediate_refresh);
			},
			/** @param {any} value */
			set(value) {
				return update_refresh_value(get_refresh_context(__, 'set', payload), value);
			},
			/** @type {Promise<any>['then']} */
			then(onfulfilled, onrejected) {
				return get_resolved_promise().then(onfulfilled, onrejected);
			},
			withOverride() {
				throw new Error(`Cannot call '${__.name}.withOverride()' on the server`);
			},
			get [Symbol.toStringTag]() {
				return 'QueryResource';
			}
		})
	);
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
			const { event } = get_request_store();
			if (!event.isRemoteRequest) {
				// If the form submission is not a remote request, refreshing the data is
				// useless, because it can't be returned to the client.
				return Promise.resolve();
			}
			const refresh_context = get_refresh_context(__, 'refresh', payload);
			const is_immediate_refresh = !refresh_context.cache[refresh_context.payload];
			const value = is_immediate_refresh ? get_promise() : fn();
			return update_refresh_value(refresh_context, value, is_immediate_refresh);
		},
		/** @param {any} value */
		set(value) {
			return update_refresh_value(get_refresh_context(__, 'set', payload), value);
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
 * @param {RequestState} state
 * @param {AbortSignal} signal — the request signal; aborts in-flight iteration when the client disconnects
 * @param {() => AsyncGenerator<any, void, void>} get_generator
 * @returns {RemoteLiveQuery<any>}
 */
function create_live_query_resource(__, payload, state, signal, get_generator) {
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
				cached = create_shared_live_iterator(signal, get_generator);
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
Object.defineProperty(query, 'fanOut', { value: fan_out, enumerable: true });
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
