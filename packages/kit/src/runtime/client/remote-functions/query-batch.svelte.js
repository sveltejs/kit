/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
import { app_dir, base } from '$app/paths/internal/client';
import { goto } from '../client.js';
import { get_remote_request_headers, QUERY_FUNCTION_ID, remote_request } from './shared.svelte.js';
import { QueryProxy } from './query/proxy.js';
import { HttpError } from '@sveltejs/kit/internal';

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query_batch(id) {
	/** @type {Map<string, Array<{resolve: (value: any) => void, reject: (error: any) => void}>>} */
	let batching = new Map();

	/** @type {RemoteQueryFunction<any, any>} */
	const wrapper = (arg) => {
		return new QueryProxy(id, arg, async (payload) => {
			return await new Promise((resolve, reject) => {
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
						const response = await remote_request(`${base}/${app_dir}/remote/${id}`, {
							method: 'POST',
							body: JSON.stringify({
								payloads: Array.from(batched.keys())
							}),
							headers
						});

						if (response.redirect) {
							await goto(response.redirect);

							// settle all batched promises (with `undefined`, like a redirect
							// from a non-batched query) so that callers don't hang forever
							for (const resolvers of batched.values()) {
								for (const { resolve } of resolvers) {
									resolve(undefined);
								}
							}

							return;
						}

						const results = response._;
						let i = 0;

						for (const resolvers of batched.values()) {
							const result = results[i];

							for (const { resolve, reject } of resolvers) {
								if (result.type === 'error') {
									reject(new HttpError(result.status, result.error));
								} else {
									resolve(result.data);
								}
							}
							i++;
						}
					} catch (e) {
						for (const resolvers of batched.values()) {
							for (const { reject } of resolvers) {
								reject(e);
							}
						}
					}
				}, 0);
			});
		});
	};

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}
