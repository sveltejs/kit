/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, goto } from '../client.js';
import { get_remote_request_headers, QUERY_FUNCTION_ID } from './shared.svelte.js';
import { QueryProxy } from './query.svelte.js';
import * as devalue from 'devalue';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { unfriendly_hydratable } from '../../shared.js';

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query_batch(id) {
	/** @type {Map<string, Array<{resolve: (value: any) => void, reject: (error: any) => void}>>} */
	let batching = new Map();

	/** @type {RemoteQueryFunction<any, any>} */
	const wrapper = (arg) => {
		return new QueryProxy(id, arg, async (key, payload) => {
			const serialized = await unfriendly_hydratable(key, () => {
				return new Promise((resolve, reject) => {
					// create_remote_function caches identical calls, but in case a refresh to the same query is called multiple times this function
					// is invoked multiple times with the same payload, so we need to deduplicate here
					const entry = batching.get(payload) ?? [];
					entry.push({ resolve, reject });
					batching.set(payload, entry);

					if (batching.size > 1) return;

					// Do this here, after await Svelte' reactivity context is gone.
					// TODO is it possible to have batches of the same key
					// but in different forks/async contexts and in the same macrotask?
					// If so this would potentially be buggy
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

							const results = devalue.parse(result.result, app.decoders);

							// Resolve individual queries
							// Maps guarantee insertion order so we can do it like this
							let i = 0;

							for (const resolvers of batched.values()) {
								for (const { resolve, reject } of resolvers) {
									if (results[i].type === 'error') {
										reject(new HttpError(results[i].status, results[i].error));
									} else {
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

			return devalue.parse(serialized, app.decoders);
		});
	};

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}
