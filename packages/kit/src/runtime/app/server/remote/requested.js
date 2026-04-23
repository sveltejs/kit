/** @import { RemoteQueryFunction, RequestedResult } from '@sveltejs/kit' */
/** @import { MaybePromise, RemoteQueryInternals } from 'types' */
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
 * ```ts
 * import { requested } from '$app/server';
 *
 * await requested(getPost, 5).refreshAll();
 * ```
 *
 * @template Input
 * @template Output
 * @template [Validated=Input]
 * @param {RemoteQueryFunction<Input, Output, Validated>} query
 * @param {number} limit
 * @returns {RequestedResult<Validated, Output>}
 */
export function requested(query, limit) {
	const { state } = get_request_store();
	const internals = /** @type {RemoteQueryInternals | undefined} */ (/** @type {any} */ (query).__);

	if (!internals || internals.type !== 'query') {
		throw new Error('requested(...) expects a query function created with query(...)');
	}

	const requested = state.remote.requested;
	const payloads = requested?.get(internals.id) ?? [];
	const refreshes = (state.remote.refreshes ??= {});
	const [selected, skipped] = split_limit(payloads, limit);

	/**
	 * @param {string} payload
	 * @param {unknown} error
	 */
	const record_failure = (payload, error) => {
		const promise = Promise.reject(error);
		promise.catch(noop);

		const key = create_remote_key(internals.id, payload);
		refreshes[key] = promise;
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

					yield { arg: validated, query: internals.bind(payload, validated) };
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
					return { arg: validated, query: internals.bind(payload, validated) };
				} catch (error) {
					record_failure(payload, error);
					throw new Error(`Skipping ${internals.name}(${payload})`, { cause: error });
				}
			});
		},
		async refreshAll() {
			for await (const { query } of this) {
				void query.refresh();
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
