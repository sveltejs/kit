/** @import { RemoteQuery, RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteInternals, MaybePromise, RequestState, RemoteQueryBatchInternals, RemoteQueryInternals } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { create_remote_key, stringify, stringify_remote_arg } from '../../../shared.js';
import { app_dir, base } from '$app/paths/internal/server';
import { prerendering } from '__sveltekit/environment';
import { noop } from '../../../../utils/functions.js';
import {
	create_validator,
	get_cache,
	get_response,
	parse_remote_response,
	run_remote_function
} from './shared.js';
import { handle_error_and_jsonify } from '../../../server/utils.js';
import { HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import { create_request_cache, get_request_cache_options } from '../../../server/cache.js';

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
				run_remote_function(
					event,
					state,
					false,
					create_request_cache(state, create_remote_key(__.id, payload)),
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
		const query_id = create_remote_key(__.id, payload);

		return create_query_resource(__, payload, state, () =>
			(async () => {
				const cached = deserialize_query_cache_entry(await state.remote.cache?.get(query_id));
				if (cached !== null) {
					await set_remote_query_cache_headers(
						event,
						state,
						__.id,
						get_remaining_cache_options(cached)
					);
					return parse_remote_response(cached.response, state.transport);
				}

				const cache = create_request_cache(state, query_id);
				const result = await run_remote_function(
					event,
					state,
					false,
					cache,
					() => validate(arg),
					fn
				);

				const options = get_request_cache_options(cache);
				if (!options || !state.remote.cache) return result;

				const stringified = stringify(result, state.transport);
				await state.remote.cache.set(
					query_id,
					serialize_query_cache_entry(stringified, options),
					options
				);
				await set_remote_query_cache_headers(event, state, __.id, options);

				return result;
			})()
		);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}

/**
 * @param {import('@sveltejs/kit').CacheOptions} input
 */
function query_cache(input) {
	get_request_store().state.cache(input);
}

/**
 * @param {string[]} tags
 */
async function invalidate_query_cache(tags) {
	await get_request_store().state.cache.invalidate(tags);
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

	/** @type {RemoteQueryBatchInternals} */
	const __ = {
		type: 'query_batch',
		id: '',
		name: '',
		run: async (args, options) => {
			const { event, state } = get_request_store();
			const payloads = args.map((arg) => stringify_remote_arg(arg, state.transport));
			const query_ids = payloads.map((payload) => create_remote_key(__.id, payload));
			const results = new Array(args.length);
			/** @type {number[]} */
			const missing = [];
			const cached = await Promise.all(
				query_ids.map(async (query_id) =>
					deserialize_query_cache_entry(await state.remote.cache?.get(query_id))
				)
			);

			for (let i = 0; i < cached.length; i++) {
				if (cached[i] !== null) {
					results[i] = { type: 'result', data: cached[i] };
				} else {
					missing.push(i);
				}
			}

			if (missing.length === 0) {
				return /** @type {any[]} */ (results);
			}

			const missing_args = missing.map((index) => args[index]);
			const cache = create_request_cache(state, __.id);

			const computed = await run_remote_function(
				event,
				state,
				false,
				cache,
				async () => Promise.all(missing_args.map(validate)),
				async (/** @type {any[]} */ input) => {
					const get_result = await fn(input);

					return Promise.all(
						input.map(async (arg, i) => {
							const index = missing[i];
							const query_id = query_ids[index];
							try {
								const data = get_result(arg, i);
								const stringified = stringify(data, state.transport);
								const cache_options = get_request_cache_options(cache);
								if (cache_options && state.remote.cache) {
									await state.remote.cache.set(
										query_id,
										serialize_query_cache_entry(stringified, {
											...cache_options,
											tags: [...cache_options.tags, query_id]
										}),
										cache_options
									);
								}
								return {
									index,
									result: { type: 'result', data: stringified }
								};
							} catch (error) {
								return {
									index,
									result: {
										type: 'error',
										error: await handle_error_and_jsonify(event, state, options, error),
										status:
											error instanceof HttpError || error instanceof SvelteKitError
												? error.status
												: 500
									}
								};
							}
						})
					);
				}
			);

			for (const item of computed) {
				results[item.index] = item.result;
			}

			return /** @type {any[]} */ (results);
		}
	};

	/** @type {Map<string, { arg: any, payload: string, resolvers: Array<{resolve: (value: any) => void, reject: (error: any) => void}> }>} */
	let batching = new Map();

	/** @type {RemoteQueryFunction<Input, Output> & { __: RemoteQueryBatchInternals }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query.batch '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();
		// batched queries do not participate in `requested(...)`, so `arg` is
		// always the raw user-supplied value and can be used for the cache key directly
		const payload = stringify_remote_arg(arg, state.transport);

		return create_query_resource(__, payload, state, () => {
			// Collect all the calls to the same query in the same macrotask,
			// then execute them as one backend request.
			return new Promise((resolve, reject) => {
				const entry = batching.get(payload);

				if (entry) {
					entry.resolvers.push({ resolve, reject });
					return;
				}

				batching.set(payload, {
					arg,
					payload,
					resolvers: [{ resolve, reject }]
				});

				if (batching.size > 1) return;

				setTimeout(async () => {
					const batched = batching;
					batching = new Map();
					const all_entries = Array.from(batched.values());
					const all_payloads = all_entries.map((entry) => entry.payload);
					const all_query_ids = all_payloads.map((payload) => create_remote_key(__.id, payload));
					try {
						const cached = await Promise.all(
							all_query_ids.map(async (query_id) =>
								deserialize_query_cache_entry(await state.remote.cache?.get(query_id))
							)
						);

						/** @type {Array<{ arg: any, query_id: string, resolvers: Array<{resolve: (value: any) => void, reject: (error: any) => void}> }>} */
						const missing_entries = [];

						for (let i = 0; i < cached.length; i++) {
							if (cached[i] !== null) {
								const value = parse_remote_response(cached[i], state.transport);
								for (const resolver of all_entries[i].resolvers) {
									resolver.resolve(value);
								}
							} else {
								missing_entries.push({
									arg: all_entries[i].arg,
									query_id: all_query_ids[i],
									resolvers: all_entries[i].resolvers
								});
							}
						}

						if (missing_entries.length === 0) {
							return;
						}

						const args = missing_entries.map((entry) => entry.arg);
						const cache = create_request_cache(state, __.id);

						await run_remote_function(
							event,
							state,
							false,
							cache,
							async () => Promise.all(args.map(validate)),
							async (input) => {
								const get_result = await fn(input);

								for (let i = 0; i < missing_entries.length; i++) {
									try {
										const result = get_result(input[i], i);
										const stringified = stringify(result, state.transport);
										const cache_options = get_request_cache_options(cache);
										if (cache_options && state.remote.cache) {
											await state.remote.cache.set(
												missing_entries[i].query_id,
												serialize_query_cache_entry(stringified, {
													...cache_options,
													tags: [...cache_options.tags, missing_entries[i].query_id]
												}),
												cache_options
											);
										}

										for (const resolver of missing_entries[i].resolvers) {
											resolver.resolve(result);
										}
									} catch (error) {
										for (const resolver of missing_entries[i].resolvers) {
											resolver.reject(error);
										}
									}
								}
							}
						);
					} catch (error) {
						for (const entry of all_entries) {
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
			const refresh_context = get_refresh_context(__, 'refresh', payload);
			const is_immediate_refresh = !refresh_context.cache[refresh_context.payload];
			const value = is_immediate_refresh ? get_promise() : fn();
			return update_refresh_value(refresh_context, value, is_immediate_refresh);
		},
		async invalidate() {
			const tag = create_remote_key(__.id, payload);
			await invalidate_query_cache([tag]);
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

// Add batch as a property to the query function
Object.defineProperty(query, 'batch', { value: batch, enumerable: true });
Object.defineProperty(query, 'cache', { value: query_cache, enumerable: true });
Object.defineProperty(query_cache, 'invalidate', {
	value: invalidate_query_cache,
	enumerable: true
});

/**
 * @param {RemoteInternals} __
 * @param {'set' | 'refresh'} action
 * @param {string} payload — the stringified raw argument
 * @returns {{ __: RemoteInternals; state: any; refreshes: Record<string, Promise<any>>; cache: Record<string, { serialize: boolean; data: any }>; refreshes_key: string; payload: string }}
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
 * @param {{ __: RemoteInternals; refreshes: Record<string, Promise<any>>; cache: Record<string, { serialize: boolean; data: any }>; refreshes_key: string; payload: string }} context
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
		refreshes[refreshes_key] = promise;
	}

	return promise.then(noop, noop);
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string} query_id
 */
function is_remote_query_endpoint_request(event, query_id) {
	if (!event.isRemoteRequest || event.isSubRequest) return false;

	const pathname = new URL(event.request.url).pathname;
	let prefix = `${base}/${app_dir}/remote/${query_id}`;
	if (prefix.endsWith('/')) {
		prefix = prefix.slice(0, -1);
	}

	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * @typedef {{
 * 	response: string;
 * 	maxAge: number;
 * 	staleWhileRevalidate?: number;
 * 	tags: string[];
 * 	age: number;
 * }} QueryCacheEntry
 */

/**
 * @param {string} stringified_response
 * @param {import('types').KitCacheOptions} cache
 */
function serialize_query_cache_entry(stringified_response, cache) {
	return JSON.stringify({
		response: stringified_response,
		maxAge: cache.maxAge,
		staleWhileRevalidate: cache.staleWhileRevalidate,
		tags: cache.tags,
		// not great that we have to trust the node process to have the correct time,
		// but cross-provider this is the best we can do.
		age: Date.now()
	});
}

/**
 * Better safe than sorry: deserialize the cache entry and validate the fields
 * @param {string | undefined | null} value
 * @returns {QueryCacheEntry | null}
 */
function deserialize_query_cache_entry(value) {
	try {
		if (value == null) return null;
		const entry = JSON.parse(value);
		if (typeof entry !== 'object' || !entry) return null;
		if (typeof entry.response !== 'string') return null;
		if (typeof entry.maxAge !== 'number' || !Number.isFinite(entry.maxAge)) return null;
		if (typeof entry.age !== 'number' || !Number.isFinite(entry.age)) return null;
		if (!Array.isArray(entry.tags)) return null;
		for (const tag of entry.tags) {
			if (typeof tag !== 'string') return null;
		}
		if (
			entry.staleWhileRevalidate !== undefined &&
			(typeof entry.staleWhileRevalidate !== 'number' ||
				!Number.isFinite(entry.staleWhileRevalidate))
		) {
			return null;
		}

		return entry;
	} catch {
		return null;
	}
}

/**
 * @param {QueryCacheEntry} entry
 * @returns {import('types').KitCacheOptions}
 */
function get_remaining_cache_options(entry) {
	const elapsed = Math.max(0, (Date.now() - entry.age) / 1000);
	const max_age = Math.max(0, entry.maxAge - elapsed);
	const stale_window = Math.max(
		0,
		entry.maxAge + (entry.staleWhileRevalidate ?? 0) - elapsed - max_age
	);

	return {
		maxAge: max_age,
		staleWhileRevalidate: stale_window > 0 ? stale_window : undefined,
		tags: entry.tags
	};
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {RequestState} state
 * @param {string} query_id
 * @param {import('types').KitCacheOptions} cache
 */
async function set_remote_query_cache_headers(event, state, query_id, cache) {
	if (!state.remote.cache?.setHeaders) return;
	if (!is_remote_query_endpoint_request(event, query_id)) return;

	const headers = new Headers();
	await state.remote.cache.setHeaders(headers, cache);

	const values = Object.fromEntries(headers.entries());
	if (Object.keys(values).length > 0) {
		event.setHeaders(values);
	}
}
