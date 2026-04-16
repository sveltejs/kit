/** @import { RemoteFunctionResponse, RemoteRefreshMap } from 'types' */
/** @import { RemoteQueryUpdate } from '@sveltejs/kit' */
import * as devalue from 'devalue';
import { app, goto, query_map } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { untrack } from 'svelte';
import { create_remote_key, split_remote_key } from '../../shared.js';
import { navigating, page } from '../state.svelte.js';

/** Indicates a query function, as opposed to a query instance */
export const QUERY_FUNCTION_ID = Symbol('sveltekit.query_function_id');
/** Indicates a query override callback, used to release the override */
export const QUERY_OVERRIDE_KEY = Symbol('sveltekit.query_override_key');
/** Indicates a query instance */
export const QUERY_RESOURCE_KEY = Symbol('sveltekit.query_resource_key');

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
				// of this functionand request that they be refreshed by the command handler
				// @ts-expect-error
				const id = /** @type {string} */ (update[QUERY_FUNCTION_ID]);
				const entries = query_map.get(id);

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

		throw new Error('updates() expects a query function, query resource, or query override');
	}

	return { overrides, refreshes };
}

/**
 * Apply refresh data from the server to the relevant queries
 *
 * @param {string} stringified_refreshes
 */
export function apply_refreshes(stringified_refreshes) {
	const refreshes = Object.entries(
		/** @type {RemoteRefreshMap} */ (devalue.parse(stringified_refreshes, app.decoders))
	);

	for (const [key, value] of refreshes) {
		const parts = split_remote_key(key);

		const entry = query_map.get(parts.id)?.get(parts.payload);

		if (value.type === 'result') {
			entry?.resource.set(value.data);
		} else {
			entry?.resource.fail(new HttpError(value.status ?? 500, value.error));
		}
	}
}
