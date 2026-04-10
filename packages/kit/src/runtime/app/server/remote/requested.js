/** @import { RemoteLiveQueryFunction, RemoteQueryFunction, RequestedResult, QueryRequestedResult, LiveQueryRequestedResult, RemoteLiveQuery, RemoteQuery } from '@sveltejs/kit' */
/** @import { MaybePromise, RemoteQueryInternals, RemoteQueryLiveInternals } from 'types' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { create_remote_key, parse_remote_arg } from '../../../shared.js';
import { mark_argument_validated } from './shared.js';
import { noop } from '../../../../utils/functions.js';

/**
 * In the context of a remote `command` or `form` request, returns an iterable
 * of the client-requested refreshes' validated arguments up to the supplied limit.
 * Arguments that fail validation or exceed the limit are recorded as failures in
 * the response to the client.
 *
 * @example
 * ```ts
 * import { requested } from '$app/server';
 *
 * for (const arg of requested(getPost, 5)) {
 * 	// it's safe to throw away this promise -- SvelteKit
 * 	// will await it for us and handle any errors by sending
 * 	// them to the client.
 * 	void getPost(arg).refresh();
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
 * For live queries, the same applies, but with `reconnect` and `reconnectAll`.
 *
 * @template Input
 * @template Output
 * @overload
 * @param {RemoteQueryFunction<Input, Output>} query
 * @param {number} [limit=Infinity]
 * @returns {QueryRequestedResult<Input>}
 */
/**
 * In the context of a remote `command` or `form` request, returns an iterable
 * of the client-requested refreshes' validated arguments up to the supplied limit.
 * Arguments that fail validation or exceed the limit are recorded as failures in
 * the response to the client.
 *
 * @example
 * ```ts
 * import { requested } from '$app/server';
 *
 * for (const arg of requested(getPost, 5)) {
 * 	// it's safe to throw away this promise -- SvelteKit
 * 	// will await it for us and handle any errors by sending
 * 	// them to the client.
 * 	void getPost(arg).refresh();
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
 * For live queries, the same applies, but with `reconnect` and `reconnectAll`.
 *
 * @template Input
 * @template Output
 * @overload
 * @param {RemoteLiveQueryFunction<Input, Output>} query
 * @param {number} [limit=Infinity]
 * @returns {LiveQueryRequestedResult<Input>}
 */
/**
 * In the context of a remote `command` or `form` request, returns an iterable
 * of the client-requested refreshes' validated arguments up to the supplied limit.
 * Arguments that fail validation or exceed the limit are recorded as failures in
 * the response to the client.
 *
 * @example
 * ```ts
 * import { requested } from '$app/server';
 *
 * for (const arg of requested(getPost, 5)) {
 * 	// it's safe to throw away this promise -- SvelteKit
 * 	// will await it for us and handle any errors by sending
 * 	// them to the client.
 * 	void getPost(arg).refresh();
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
 * For live queries, the same applies, but with `reconnect` and `reconnectAll`.
 *
 * @template Input
 * @template Output
 * @param {RemoteQueryFunction<Input, Output> | RemoteLiveQueryFunction<Input, Output>} query
 * @param {number} [limit=Infinity]
 * @returns {RequestedResult<Input>}
 */
export function requested(query, limit = Infinity) {
	const { state } = get_request_store();
	const internals = /** @type {RemoteQueryInternals | RemoteQueryLiveInternals | undefined} */ (
		/** @type {any} */ (query).__
	);

	if (!internals || (internals.type !== 'query' && internals.type !== 'query_live')) {
		throw new Error(
			'requested(...) expects a query function created with query(...) or query.live(...)'
		);
	}

	const requested = state.remote.requested;
	const payloads = requested?.get(internals.id) ?? [];
	const refreshes = (state.remote.refreshes ??= new Map());
	const reconnects = (state.remote.reconnects ??= new Map());
	const store = internals.type === 'query' ? refreshes : reconnects;
	const [selected, skipped] = split_limit(payloads, limit);

	/**
	 * @param {string} payload
	 * @param {unknown} error
	 */
	const record_failure = (payload, error) => {
		const promise = Promise.reject(error);
		promise.catch(noop);

		const key = create_remote_key(internals.id, payload);
		store.set(key, promise);
	};

	for (const payload of skipped) {
		record_failure(
			payload,
			new Error(
				`Requested refresh was rejected because it exceeded requested(${internals.name}, ${limit}) limit`
			)
		);
	}

	return {
		*[Symbol.iterator]() {
			for (const payload of selected) {
				try {
					const parsed = parse_remote_arg(payload, state.transport);
					const validated = internals.validate(parsed);

					if (is_thenable(validated)) {
						throw new Error(
							// TODO improve
							`requested(${internals.name}, ${limit}) cannot be used with synchronous iteration because the query validator is async. Use \`for await ... of\` instead`
						);
					}

					yield mark_argument_validated(internals, state, validated);
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
					const validated = await internals.validate(parsed);
					return mark_argument_validated(internals, state, validated);
				} catch (error) {
					record_failure(payload, error);
					throw new Error(`Skipping ${internals.name}(${payload})`, { cause: error });
				}
			});
		},
		async refreshAll() {
			if (internals.type !== 'query') {
				throw new Error('refreshAll() is invalid for live queries. Use reconnectAll() instead.');
			}

			for await (const arg of this) {
				void (/** @type {RemoteQuery<Output>} */ (query(arg)).refresh());
			}
		},
		async reconnectAll() {
			if (internals.type !== 'query_live') {
				throw new Error('reconnectAll() is invalid for regular queries. Use refreshAll() instead.');
			}

			for await (const arg of this) {
				void (/** @type {RemoteLiveQuery<Output>} */ (query(arg)).reconnect());
			}
		}
	};
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

		promise.catch(noop);
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
