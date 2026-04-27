/** @import { RemoteFunctionResponse, RemoteSingleflightMap, RemoteSingleflightEntry } from 'types' */
/** @import { RemoteQueryUpdate } from '@sveltejs/kit' */
import * as devalue from 'devalue';
import { app, goto, live_query_map, query_map } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { untrack } from 'svelte';
import { create_remote_key, split_remote_key } from '../../shared.js';
import { navigating, page } from '../state.svelte.js';
import { noop } from '../../../utils/functions.js';

/** Indicates a query function, as opposed to a query instance */
export const QUERY_FUNCTION_ID = Symbol('sveltekit.query_function_id');
/** Indicates a query override callback, used to release the override */
export const QUERY_OVERRIDE_KEY = Symbol('sveltekit.query_override_key');
/** Indicates a query instance */
export const QUERY_RESOURCE_KEY = Symbol('sveltekit.query_resource_key');

/**
 * @returns {boolean} Returns `true` if we are in an effect
 */
export function is_in_effect() {
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
	return untrack(() => {
		const url = navigating.current?.to?.url ?? page.url;

		return {
			'x-sveltekit-pathname': url.pathname,
			'x-sveltekit-search': url.search
		};
	});
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

	const resolved = await handle_side_channel_response(result);

	return resolved.result;
}

/**
 * @param {RemoteFunctionResponse} response
 * @returns {Promise<Extract<RemoteFunctionResponse, { type: 'result' }>>}
 */
export async function handle_side_channel_response(response) {
	if (response.type === 'redirect') {
		await goto(response.location);
		throw new Redirect(307, response.location);
	}

	if (response.type === 'error') {
		throw new HttpError(response.status ?? 500, response.error);
	}

	return response;
}

/**
 * Given an array of updates, which could be query instances, query functions, or query override release functions,
 * categorize them into overrides (which need to be released after the command completes), refreshes (which
 * just need to be refreshed after the command completes), or both.
 *
 * @param {RemoteQueryUpdate[]} updates
 * @returns {{ overrides: Array<() => void>, refreshes: Set<string> }}
 */
export function categorize_updates(updates) {
	/** @type {Set<string>} */
	const override_keys = new Set();
	/** @type {Array<() => void>} */
	const overrides = [];
	/** @type {Set<string>} */
	const refreshes = new Set();

	for (const update of updates) {
		if (typeof update === 'function') {
			if (Object.hasOwn(update, QUERY_FUNCTION_ID)) {
				// this is a query function (not instance), so we need to find all active instances
				// of this function and request that they be refreshed/reconnected by the command handler
				// @ts-expect-error
				const id = /** @type {string} */ (update[QUERY_FUNCTION_ID]);
				const entries = query_map.get(id) ?? live_query_map.get(id);

				if (entries) {
					for (const payload of entries.keys()) {
						refreshes.add(create_remote_key(id, payload));
					}
				}

				continue;
			}

			if (Object.hasOwn(update, QUERY_OVERRIDE_KEY)) {
				// this is a query override release function, so we need to both request that the query instance
				// be refreshed _and_ stash the release function so we can release the override after the command completes
				// @ts-expect-error
				const key = /** @type {string} */ (update[QUERY_OVERRIDE_KEY]);
				refreshes.add(key);

				if (override_keys.has(key)) {
					throw new Error(
						'Multiple overrides for the same query are not allowed in a single updates() invocation'
					);
				}

				override_keys.add(key);
				overrides.push(/** @type {() => void} */ (update));
				continue;
			}

			// this is just a regular function provided by some user integration, so we can just stash it in the overrides array
			overrides.push(/** @type {() => void} */ (update));
			continue;
		}

		if (
			typeof update === 'object' &&
			update !== null &&
			Object.hasOwn(update, QUERY_RESOURCE_KEY)
		) {
			// this is a query instance, so we just need to request that it be refreshed
			// @ts-expect-error
			refreshes.add(/** @type {string} */ (update[QUERY_RESOURCE_KEY]));
			continue;
		}

		throw new Error(
			'updates() expects a query or live query function, query resource, or query override'
		);
	}

	return { overrides, refreshes };
}

/**
 * @template TResource
 * @param {string} stringified_singleflight
 * @param {Map<string, Map<string, { resource: TResource }>>} map
 * @param {(resource: TResource, value: RemoteSingleflightEntry) => void} callback
 */
function apply_singleflight(stringified_singleflight, map, callback) {
	const singleflight = /** @type {RemoteSingleflightMap} */ (
		devalue.parse(stringified_singleflight, app.decoders)
	);

	for (const [key, value] of Object.entries(singleflight)) {
		const parts = split_remote_key(key);
		const entry = map.get(parts.id)?.get(parts.payload);
		if (entry?.resource) {
			callback(entry.resource, value);
		}
	}
}

/**
 * Apply refresh data from the server to the relevant queries
 *
 * @param {string} stringified_refreshes
 */
export const apply_refreshes = (stringified_refreshes) => {
	apply_singleflight(stringified_refreshes, query_map, (resource, value) => {
		if (value.type === 'result') {
			resource?.set(value.data);
		} else {
			resource?.fail(new HttpError(value.status ?? 500, value.error));
		}
	});
};

/** @param {string} stringified_reconnects */
export const apply_reconnections = (stringified_reconnects) => {
	apply_singleflight(stringified_reconnects, live_query_map, (resource, value) => {
		if (value.type === 'result') {
			resource?.set(value.data);
			void resource?.reconnect();
		} else {
			resource?.fail(new HttpError(value.status ?? 500, value.error));
		}
	});
};
