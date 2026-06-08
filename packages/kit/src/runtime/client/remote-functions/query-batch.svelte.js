/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, goto } from '../client.js';
import {
	apply_queries,
	create_remote_pointer_reviver,
	get_remote_request_headers,
	QUERY_FUNCTION_ID,
	register_pointer_reviver
} from './shared.svelte.js';
import { QueryProxy } from './query/proxy.js';
import * as devalue from 'devalue';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { parse_remote_value, stringify_remote_arg, unfriendly_hydratable } from '../../shared.js';

/** @type {Map<string, (key: string, payload: string) => Promise<any>>} */
const batch_fetchers = new Map();

/**
 * Memoized per id so that all calls (and revived pointers) for the same `query.batch`
 * function share a single batch.
 * @param {string} id
 */
function get_batch_fetcher(id) {
	let fetcher = batch_fetchers.get(id);

	if (!fetcher) {
		fetcher = create_batch_fetcher(id);
		batch_fetchers.set(id, fetcher);
	}

	return fetcher;
}

/**
 * @param {string} id
 * @returns {(key: string, payload: string) => Promise<any>}
 */
function create_batch_fetcher(id) {
	/** @type {Map<string, Array<{ resolve: (value: any) => void, reject: (error: any) => void, set_revive: (revive: (pointer: [string, string, 'q' | 'b' | 'p']) => any) => void }>>} */
	let batching = new Map();

	return (key, payload) => {
		/** @type {((pointer: [string, string, 'q' | 'b' | 'p']) => any) | undefined} */
		let revive;

		const hydrated = unfriendly_hydratable(key, () => {
			return new Promise((resolve, reject) => {
				// create_remote_function caches identical calls, but in case a refresh to the same query is called multiple times this function
				// is invoked multiple times with the same payload, so we need to deduplicate here
				const entry = batching.get(payload) ?? [];
				entry.push({ resolve, reject, set_revive: (r) => (revive = r) });
				batching.set(payload, entry);

				if (batching.size > 1) return;

				// Do this here, after await Svelte' reactivity context is gone.
				const headers = {
					'Content-Type': 'application/json',
					...get_remote_request_headers()
				};

				// Wait for the next macrotask - don't use microtask as Svelte runtime uses these to collect changes and flush them,
				// and flushes could reveal more queries that should be batched.
				setTimeout(async () => {
					const batched = batching;
					batching = new Map();

					try {
						const response = await fetch(`${base}/${app_dir}/remote/${id}`, {
							method: 'POST',
							body: JSON.stringify({
								payloads: Array.from(batched.keys())
							}),
							headers
						});

						if (!response.ok) {
							throw new Error('Failed to execute batch query');
						}

						const result = /** @type {RemoteFunctionResponse} */ (await response.json());
						if (result.type === 'error') {
							throw new HttpError(result.status ?? 500, result.error);
						}

						if (result.type === 'redirect') {
							await goto(result.location);
							throw new Redirect(307, result.location);
						}

						// apply the side-channel and build a reviver shared by every entry in the batch
						const batch_revive = apply_queries(result.queries);

						const results = devalue.parse(result.result, app.decoders);

						// Resolve individual queries
						// Maps guarantee insertion order so we can do it like this
						let i = 0;

						for (const resolvers of batched.values()) {
							for (const { resolve, reject, set_revive } of resolvers) {
								if (results[i].type === 'error') {
									reject(new HttpError(results[i].status, results[i].error));
								} else {
									set_revive(batch_revive);
									resolve(results[i].data);
								}
							}
							i++;
						}
					} catch (error) {
						// Reject all queries in the batch
						for (const resolver of batched.values()) {
							for (const { reject } of resolver) {
								reject(error);
							}
						}
					}
				}, 0);
			});
		});

		// Hydration served the value synchronously (always a string). Parse it now so nested
		// pointers read their hydratable seeds within the same synchronous hydration window.
		if (typeof hydrated === 'string') {
			return Promise.resolve(
				parse_remote_value(hydrated, app.decoders, create_remote_pointer_reviver())
			);
		}

		return Promise.resolve(hydrated).then((serialized) =>
			parse_remote_value(serialized, app.decoders, revive ?? create_remote_pointer_reviver())
		);
	};
}

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query_batch(id) {
	const fetcher = get_batch_fetcher(id);

	/** @type {RemoteQueryFunction<any, any>} */
	const wrapper = (arg) => {
		return new QueryProxy(id, stringify_remote_arg(arg, app.hooks.transport), fetcher);
	};

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });
	Object.defineProperty(wrapper, 'from', {
		value: /** @type {RemoteQueryFunction<any, any>['from']} */ (
			(arg, value) =>
				// Seed via `initial` (rather than `.set`) so an already-mounted entry for the
				// same key is never clobbered — matching how revived nested pointers are seeded.
				new QueryProxy(id, stringify_remote_arg(arg, app.hooks.transport), fetcher, {
					type: 'result',
					value
				})
		),
		enumerable: true
	});

	return wrapper;
}

// Revive `[id, payload, 'b']` pointers (nested `query.batch` results) into a QueryProxy.
register_pointer_reviver(
	'b',
	(id, payload, initial) => new QueryProxy(id, payload, get_batch_fetcher(id), initial)
);
