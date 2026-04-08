/** @import { RemoteFunctionResponse, RemoteRefreshMap } from 'types' */
/** @import { RemoteQueryUpdate } from '@sveltejs/kit' */
import * as devalue from 'devalue';
import { app, goto, query_map } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { untrack } from 'svelte';
import {
	create_remote_key,
	evict_cache_entries_matching_tags,
	split_remote_key,
	SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER,
	SVELTEKIT_CACHE_CONTROL_TAGS_HEADER,
	SVELTEKIT_RUNTIME_CACHE_CONTROL_HEADER
} from '../../shared.js';
import { DEV } from 'esm-env';
import { navigating, page } from '../state.svelte.js';
import { version } from '__sveltekit/environment';

/** Indicates a query function, as opposed to a query instance */
export const QUERY_FUNCTION_ID = Symbol('sveltekit.query_function_id');
/** Indicates a query override callback, used to release the override */
export const QUERY_OVERRIDE_KEY = Symbol('sveltekit.query_override_key');
/** Indicates a query instance */
export const QUERY_RESOURCE_KEY = Symbol('sveltekit.query_resource_key');

/** Cache name for remote query private directive; in DEV includes a unique suffix so each load gets a fresh cache. */
const REMOTE_PRIVATE_CACHE_NAME = DEV
	? `sveltekit:private-cache:${Date.now()}`
	: `sveltekit:private-cache:${version}`;

/** @type {Cache | undefined} */
let private_remote_cache;

const private_remote_cache_ready = (async () => {
	if (typeof caches === 'undefined') return;

	try {
		private_remote_cache = await caches.open(REMOTE_PRIVATE_CACHE_NAME);

		const cache_names = await caches.keys();
		for (const cache_name of cache_names) {
			if (
				cache_name.startsWith('sveltekit:private-cache:') &&
				cache_name !== REMOTE_PRIVATE_CACHE_NAME
			) {
				await caches.delete(cache_name);
			}
		}
	} catch (error) {
		console.warn('Failed to initialize SvelteKit remote private cache:', error);
	}
})();

/**
 * Seconds elapsed since the cached response was generated.
 * Falls back to 0 if there is no `Date` header.
 * @param {Response} res
 * @returns {number}
 */
function private_cache_age(res) {
	const date = res.headers.get('date');
	if (!date) return 0;
	return Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
}

/**
 * Parse `max-age` from {@link SVELTEKIT_RUNTIME_CACHE_CONTROL_HEADER} on the cached response.
 * @param {Response} res
 * @returns {number}
 */
function private_cache_max_age(res) {
	const cc = res.headers.get(SVELTEKIT_RUNTIME_CACHE_CONTROL_HEADER) ?? '';
	const m = /max-age=(\d+)/i.exec(cc);
	return m ? parseInt(m[1], 10) : 0;
}

/**
 * Shared unwrap logic for remote function responses (redirect / error / result).
 * @param {RemoteFunctionResponse} result
 * @returns {Promise<any>}
 */
async function unwrap_remote_result(result) {
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
 * @param {Response} response
 */
export async function apply_private_cache_invalidate_headers(response) {
	const raw = response.headers.get(SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER);
	if (!raw) return;

	const tags = raw
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);

	await private_remote_cache_ready;
	const cache = private_remote_cache;
	if (!cache || !tags.length) return;

	try {
		await evict_cache_entries_matching_tags(cache, tags);
	} catch {
		// ignore
	}
}

/**
 * @param {string} url
 * @param {HeadersInit} headers
 */
export async function remote_request(url, headers) {
	const init = {
		headers: {
			'Content-Type': 'application/json',
			...headers
		}
	};

	await private_remote_cache_ready;
	const cache = private_remote_cache;
	if (cache) {
		try {
			const hit = await cache.match(url);

			if (hit) {
				const age = private_cache_age(hit);
				const max_age = private_cache_max_age(hit);

				if (max_age > 0 && age <= max_age) {
					const result = /** @type {RemoteFunctionResponse} */ (await hit.json());
					return unwrap_remote_result(result);
				}

				// stale — evict
				await cache.delete(url);
			}
		} catch (_) {
			// ignore
		}
	}

	const response = await fetch(url, init);

	if (!response.ok) {
		throw new HttpError(500, 'Failed to execute remote function');
	}

	await apply_private_cache_invalidate_headers(response);

	const result = /** @type {RemoteFunctionResponse} */ (await response.json());
	const unwrapped = unwrap_remote_result(result);

	if (cache) {
		const cache_control = response.headers.get(SVELTEKIT_RUNTIME_CACHE_CONTROL_HEADER) ?? '';
		if (cache_control.includes('private') && cache_control.includes('max-age')) {
			const cache_tags = response.headers.get(SVELTEKIT_CACHE_CONTROL_TAGS_HEADER);
			await cache
				.put(
					url,
					// We need to create a new response because the original response is already consumed
					new Response(JSON.stringify(result), {
						headers: {
							'Content-Type': 'application/json',
							date: response.headers.get('date') ?? new Date().toISOString(),
							[SVELTEKIT_RUNTIME_CACHE_CONTROL_HEADER]: cache_control,
							...(cache_tags ? { [SVELTEKIT_CACHE_CONTROL_TAGS_HEADER]: cache_tags } : {})
						}
					})
				)
				.catch((e) => {
					console.error('Failed to put into cache:', e);
					// Nothing we can do here
				});
		}
	}

	return unwrapped;
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
