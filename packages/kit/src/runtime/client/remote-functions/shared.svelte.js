/** @import { RemoteQueryOverride } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
/** @import { Query } from './query.svelte.js' */
import * as devalue from 'devalue';
import { app, goto, query_map } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { untrack } from 'svelte';
import { create_remote_key, stringify_remote_arg } from '../../shared.js';
import { page } from '../state.svelte.js';
import * as svelte from 'svelte';

/**
 * @typedef {{
 * 	_key?: string;
 * 	then: Promise<unknown>['then'];
 * 	catch: Promise<unknown>['catch'];
 * }} RemoteFunctionResource
 */

/**
 * @param {() => void} noop
 * @returns {boolean} Whether the pre effect was added successfully (indicates we are in a tracking context)
 */
export function safe_pre_effect(noop = () => {}) {
	try {
		$effect.pre(noop);
		return true;
	} catch {
		return false;
	}
}

/**
 * @returns {{ 'x-sveltekit-pathname': string, 'x-sveltekit-search': string }}
 */
export function get_remote_request_headers() {
	// This will be the correct value of the current or soon-current url,
	// even in forks because it's state-based - therefore not using window.location.
	// Use untrack(...) to Avoid accidental reactive dependency on pathname/search
	return untrack(() => ({
		'x-sveltekit-pathname': page.url.pathname,
		'x-sveltekit-search': page.url.search
	}));
}

/**
 * @param {string} url
 * @param {HeadersInit} headers
 */
export async function remote_request(url, headers) {
	const response = await fetch(url, {
		headers: {
			'Content-Type': 'application/json',
			...headers
		}
	});

	if (!response.ok) {
		throw new HttpError(500, 'Failed to execute remote function');
	}

	const result = /** @type {RemoteFunctionResponse} */ (await response.json());

	if (result.type === 'redirect') {
		await goto(result.location);
		throw new Redirect(307, result.location);
	}

	if (result.type === 'error') {
		throw new HttpError(result.status ?? 500, result.error);
	}

	return result.result;
}

/**
 * @template {(arg: { cache_key: string; payload: string }) => RemoteFunctionResource} Create
 * @template {(arg: { cache_key: string; get_resource: () => { cached: boolean; resource: ReturnType<Create> } }) => RemoteFunctionResource} Limit
 * @template [Arg=any]
 * @param {string} id
 * @param {Create} create
 * @param {Limit} limit
 * @returns {(arg: Arg) => ReturnType<Create> | ReturnType<Limit>}
 */
export function create_remote_function(id, create, limit) {
	return (arg) => {
		const payload = stringify_remote_arg(arg, app.hooks.transport);
		const cache_key = create_remote_key(id, payload);

		const tracking = safe_pre_effect();

		let cache_entry = query_map.get(cache_key);
		const resource = cache_entry?.resource ?? create({ cache_key, payload });

		if (tracking) {
			if (!cache_entry) {
				cache_entry = { count: 1, resource };
				// we need to set this synchronously to avoid possibly creating
				// multiple resources for subsequent synchronous calls with the same payload
				query_map.set(cache_key, cache_entry);
			}

			$effect.pre(() => () => {
				if (!cache_entry) return;
				cache_entry.count -= 1;
				if (cache_entry.count === 0) {
					query_map.delete(cache_key);
				}
			});

			return resource;
		}

		return limit({
			cache_key,

			get_resource: () => {
				const cache_entry = query_map.get(cache_key);
				return {
					cached: !!cache_entry,
					// we should always prefer the cached resource if it exists, but if there is no cached resource,
					// we can fall back to the one we created above
					resource: cache_entry?.resource ?? resource
				};
			}
		});
	};
}

/**
 * @param {Array<Query<any> | RemoteQueryOverride>} updates
 */
export function release_overrides(updates) {
	for (const update of updates) {
		if ('release' in update) {
			update.release();
		}
	}
}

/**
 * @param {string} stringified_refreshes
 * @param {Array<Query<any> | RemoteQueryOverride>} updates
 */
export function refresh_queries(stringified_refreshes, updates = []) {
	const refreshes = Object.entries(devalue.parse(stringified_refreshes, app.decoders));

	// `refreshes` is a superset of `updates`
	for (const [key, value] of refreshes) {
		// If there was an optimistic update, release it right before we update the query
		const update = updates.find((u) => u._key === key);
		if (update && 'release' in update) {
			update.release();
		}
		// Update the query with the new value
		const entry = query_map.get(key);
		entry?.resource.set(value);
	}
}

/**
 * @template T
 * @param {string} key
 * @param {() => T} fn
 * @returns {T}
 */
export function unfriendly_hydratable(key, fn) {
	if (!svelte.hydratable) {
		throw new Error('Remote functions require Svelte 5.44.0 or later');
	}
	return svelte.hydratable(key, fn);
}
