/** @import { RemoteQueryOverride } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
import * as devalue from 'devalue';
import { app, goto, query_map } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { untrack } from 'svelte';
import { navigating, page } from '../state.svelte.js';

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
 * @param {Map<string, RemoteQueryOverride>} updates
 */
export function release_overrides(updates) {
	for (const update of updates.values()) {
		update.release();
	}
}

/**
 * @param {Map<string, RemoteQueryOverride>} map
 * @param {RemoteQueryOverride[]} updates
 */
export function populate_updates_map(map, updates) {
	map.clear();

	for (const update of updates) {
		if (
			typeof update !== 'object' ||
			update === null ||
			typeof update._key !== 'string' ||
			typeof update.release !== 'function'
		) {
			release_overrides(map);
			throw new Error(
				'updates() expects query overrides with a string _key and a release() function'
			);
		}

		if (map.has(update._key)) {
			release_overrides(map);
			update.release();
			throw new Error(
				'Duplicate query override keys are not allowed in a single updates() invocation'
			);
		}

		map.set(update._key, update);
	}
}

/**
 * @param {string} stringified_refreshes
 * @param {Map<string, RemoteQueryOverride>} [updates]
 */
export function refresh_queries(stringified_refreshes, updates) {
	const refreshes = Object.entries(devalue.parse(stringified_refreshes, app.decoders));

	for (const [key, value] of refreshes) {
		const update = updates && updates.get(key);
		if (update) {
			update.release();
			updates.delete(key);
		}

		const entry = query_map.get(key);
		entry?.resource.set(value);
	}
}
