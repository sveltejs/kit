/** @import { RemoteLiveQuery, RemoteLiveQueryFunction, RemoteQuery, RemoteQueryFunction, RequestedResult, QueryRequestedResult, LiveQueryRequestedResult } from '@sveltejs/kit' */
/** @import { MaybePromise, RemoteAnyQueryInternals } from 'types' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { create_remote_key, parse_remote_arg } from '../../../shared.js';
import { noop } from '../../../../utils/functions.js';

/**
 * In the context of a remote `command` or `form` request, returns an iterable
 * of `{ arg, query }` entries for the refreshes requested by the client, up to
 * the supplied `limit`. Each `query` is a `RemoteQuery` bound to the original
 * client-side cache key, so `refresh()` / `set()` propagate correctly even when
 * the query's schema transforms the input. `arg` is the *validated* argument,
 * i.e. the value after the schema has run (so `InferOutput<Schema>` for queries
 * declared with a Standard Schema).
 *
 * Arguments that fail validation or exceed `limit` are recorded as failures in
 * the response to the client.
 *
 * @example
 * ```ts
 * import { requested } from '$app/server';
 *
 * for (const { arg, query } of requested(getPost, 5)) {
 * 	// `arg` is the validated argument; `query` is bound to the client's
 * 	// cache key. It's safe to throw away this promise -- SvelteKit will
 * 	// await it and forward any errors to the client.
 * 	void query.refresh();
 * }
 * ```
 *
 * As a shorthand for the above, you can also call `refreshAll` on the result:
 *
 * @example
 * ```ts
 * import { requested } from '$app/server';
 *
 * await requested(getPost, 5).refreshAll();
 * ```
 *
 * Works with `query.batch` as well — refreshes for individual entries are
 * collected into a single batched call.
 *
 * For live queries, the same applies, but with `reconnect` and `reconnectAll`.
 *
 * @template Input
 * @template Output
 * @template [Validated=Input]
 * @overload
 * @param {RemoteQueryFunction<Input, Output, Validated>} query
 * @param {number} limit
 * @returns {QueryRequestedResult<Validated, Output>}
 */
/**
 * In the context of a remote `command` or `form` request, returns an iterable
 * of `{ arg, query }` entries for the reconnects requested by the client, up to
 * the supplied `limit`. Each `query` is a `RemoteLiveQuery` bound to the original
 * client-side cache key, so `reconnect()` propagates correctly even when
 * the query's schema transforms the input. `arg` is the *validated* argument.
 *
 * Arguments that fail validation or exceed `limit` are recorded as failures in
 * the response to the client.
 *
 * @example
 * ```ts
 * import { requested } from '$app/server';
 *
 * for (const { query } of requested(getPost, 5)) {
 * 	void query.reconnect();
 * }
 * ```
 *
 * As a shorthand, you can also call `reconnectAll` on the result:
 *
 * @example
 * ```ts
 * import { requested } from '$app/server';
 *
 * await requested(getPost, 5).reconnectAll();
 * ```
 *
 * @template Input
 * @template Output
 * @template [Validated=Input]
 * @overload
 * @param {RemoteLiveQueryFunction<Input, Output, Validated>} query
 * @param {number} limit
 * @returns {LiveQueryRequestedResult<Validated, Output>}
 */
/**
 * @template Input
 * @template Output
 * @template [Validated=Input]
 * @param {RemoteQueryFunction<Input, Output, Validated> | RemoteLiveQueryFunction<Input, Output, Validated>} query
 * @param {number} limit
 * @returns {RequestedResult<Validated, Output>}
 */
export function requested(query, limit) {
	const { state } = get_request_store();
	const internals = /** @type {RemoteAnyQueryInternals | undefined} */ (
		/** @type {any} */ (query).__
	);

	if (
		internals?.type !== 'query' &&
		internals?.type !== 'query_batch' &&
		internals?.type !== 'query_live'
	) {
		throw new Error(
			'requested(...) expects a query function created with query(...), query.batch(...), or query.live(...)'
		);
	}

	// narrow-stable alias so generator closures below don't lose the narrowing
	const __ = internals;

	const requested = state.remote.requested;
	const payloads = requested?.get(__.id) ?? [];
	// note: don't initialize these maps here -- they will be initialized by the
	// command/form wrapper when we enter them, and if we initialize them here
	// we will enable requested(...) in contexts where it shouldn't be allowed,
	// such as load functions or other server functions
	const refreshes = state.remote.refreshes;
	const reconnects = state.remote.reconnects;
	const store = __.type === 'query_live' ? reconnects : refreshes;

	if (!store) {
		throw new Error(
			'requested(...) can only be called in the context of a command/form remote function'
		);
	}
	const [selected, skipped] = split_limit(payloads, limit);

	/**
	 * @param {string} payload
	 * @param {unknown} error
	 */
	const record_failure = (payload, error) => {
		const promise = Promise.reject(error);
		promise.catch(noop);

		const key = create_remote_key(__.id, payload);
		store.set(key, promise);
	};

	for (const payload of skipped) {
		record_failure(
			payload,
			new Error(
				`Requested refresh was rejected because it exceeded requested(${__.name}, ${limit}) limit`
			)
		);
	}

	const result = {
		*[Symbol.iterator]() {
			for (const payload of selected) {
				try {
					const parsed = parse_remote_arg(payload, state.transport);
					const validated = __.validate(parsed);

					if (is_thenable(validated)) {
						throw new Error(
							// TODO improve
							`requested(${__.name}, ${limit}) cannot be used with synchronous iteration because the query validator is async. Use \`for await ... of\` instead`
						);
					}

					yield { arg: validated, query: __.bind(payload, validated) };
				} catch (error) {
					record_failure(payload, error);
					continue;
				}
			}
		},
		async *[Symbol.asyncIterator]() {
			yield* race_all(selected, async (payload) => {
				try {
					const parsed = parse_remote_arg(payload, state.transport);
					const validated = await __.validate(parsed);
					return { arg: validated, query: __.bind(payload, validated) };
				} catch (error) {
					record_failure(payload, error);
					throw new Error(`Skipping ${__.name}(${payload})`, { cause: error });
				}
			});
		},
		async refreshAll() {
			if (__.type === 'query_live') {
				throw new Error('refreshAll() is invalid for live queries. Use reconnectAll() instead.');
			}

			for await (const { query } of result) {
				void (/** @type {RemoteQuery<Output>} */ (query).refresh());
			}
		},
		async reconnectAll() {
			if (__.type !== 'query_live') {
				throw new Error('reconnectAll() is invalid for regular queries. Use refreshAll() instead.');
			}

			for await (const { query } of result) {
				void (/** @type {RemoteLiveQuery<Output>} */ (query).reconnect());
			}
		}
	};

	return /** @type {RequestedResult<Validated, Output>} */ (/** @type {unknown} */ (result));
}

/**
 * @template T
 * @param {Array<T>} array
 * @param {number} limit
 * @returns {[Array<T>, Array<T>]}
 */
function split_limit(array, limit) {
	if (limit === Infinity) {
		return [array, []];
	}
	if (!Number.isInteger(limit) || limit < 0) {
		throw new Error('Limit must be a non-negative integer or Infinity');
	}
	return [array.slice(0, limit), array.slice(limit)];
}

/**
 * @param {any} value
 * @returns {value is PromiseLike<any>}
 */
function is_thenable(value) {
	return !!value && (typeof value === 'object' || typeof value === 'function') && 'then' in value;
}

/**
 * Runs all callbacks immediately and yields resolved values in completion order.
 * If the promise rejects, it is skipped.
 *
 * @template T
 * @template R
 * @param {Array<T>} array
 * @param {(value: T) => MaybePromise<R>} fn
 * @returns {AsyncIterable<R>}
 */
async function* race_all(array, fn) {
	/** @type {Set<Promise<{ promise: Promise<any>, value: Awaited<R> }>>} */
	const pending = new Set();

	for (const value of array) {
		/** @type {Promise<{ promise: Promise<any>, value: Awaited<R> }>} */
		const promise = Promise.resolve(fn(value)).then((result) => ({
			promise,
			value: result
		}));

		promise.catch(() => pending.delete(promise));
		pending.add(promise);
	}

	while (pending.size > 0) {
		try {
			const { promise, value } = await Promise.race(pending);
			pending.delete(promise);
			yield value;
		} catch {
			// Ignore errors, they are handled in the fn callback and result in skip
		}
	}
}
