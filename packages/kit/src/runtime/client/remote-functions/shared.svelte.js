/** @import { RemoteFunctionResponse, RemoteQueriesMap, RemoteSingleflightEntry, RemoteResourceCode } from 'types' */
/** @import { RemoteQueryUpdate } from '@sveltejs/kit' */
import * as devalue from 'devalue';
import { app, goto, live_query_map, query_map } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { untrack } from 'svelte';
import {
	create_remote_key,
	parse_remote_value,
	split_remote_key,
	unfriendly_hydratable
} from '../../shared.js';
import { navigating, page } from '../state.svelte.js';

/**
 * @typedef {[string, string, RemoteResourceCode]} RemotePointer
 * @typedef {{ type: 'result', value: any, data?: string } | { type: 'error', error: HttpError }} PointerInitial
 */

/** Indicates a query function, as opposed to a query instance */
export const QUERY_FUNCTION_ID = Symbol('sveltekit.query_function_id');
/** Indicates a query override callback, used to release the override */
export const QUERY_OVERRIDE_KEY = Symbol('sveltekit.query_override_key');
/** Indicates a query instance */
export const QUERY_RESOURCE_KEY = Symbol('sveltekit.query_resource_key');

/**
 * If we're inside a reactive context, pin a cache entry for as long as the
 * surrounding effect is alive. Without this, a transiently-referenced
 * `QueryProxy`/`LiveQueryProxy` (e.g. one produced by `{await fn()}` in a
 * template or by `$derived(await fn())`) would be eligible for GC as soon as
 * the awaited value has been read, after which the FinalizationRegistry
 * would evict the cache entry — even though the consuming effect is still
 * alive and may rely on the entry being refreshed (e.g. via `refreshAll()`
 * or a server-initiated single-flight refresh).
 *
 * @template TResource
 * @param {Map<string, Map<string, { resource: TResource }>>} cache_map
 * @param {{ manual_ref: (entry: any, id: string, payload: string) => () => void }} cache
 * @param {string} id
 * @param {string} payload
 */
export function pin_in_effect(cache_map, cache, id, payload) {
	try {
		$effect.pre(() => {
			const entry = cache_map.get(id)?.get(payload);
			if (!entry) return;
			return cache.manual_ref(entry, id, payload);
		});
	} catch {
		// not in an effect context — nothing to pin
	}
}

/**
 * Wrap a proxy's `then`/`catch`/`finally` function so that the underlying
 * cache entry stays pinned for the lifetime of the awaited promise. Without
 * this, a proxy awaited outside any effect (e.g. in an event handler) could
 * be GC'd between the `.then` getter returning the thenable and the
 * underlying promise settling, causing the FinalizationRegistry to evict the
 * cache entry mid-flight and the awaited value to resolve to Svelte's
 * `UNINITIALIZED` sentinel from a torn-down `$derived`.
 *
 * @template TResource
 * @template {(...args: any[]) => Promise<any>} TThen
 * @param {Map<string, Map<string, { resource: TResource }>>} cache_map
 * @param {{ manual_ref: (entry: any, id: string, payload: string) => () => void }} cache
 * @param {string} id
 * @param {string} payload
 * @param {TThen} then
 * @returns {TThen}
 */
export function pin_while_resolving(cache_map, cache, id, payload, then) {
	return /** @type {TThen} */ (
		(...a) => {
			const entry = cache_map.get(id)?.get(payload);
			const release = entry ? cache.manual_ref(entry, id, payload) : undefined;
			const promise = then(...a);
			if (release) {
				promise.then(release, release);
			}
			return promise;
		}
	);
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
 * Perform a GET request to a remote function endpoint and return the resolved
 * `result`-typed response (after handling redirects/errors). The caller is responsible for
 * applying the `queries` side-channel and reviving `result`.
 *
 * @param {string} url
 * @param {HeadersInit} headers
 */
export async function remote_response(url, headers) {
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

	return handle_side_channel_response(result);
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
 * Registered by the query / query.batch / prerender client modules so that nested resource
 * pointers (`[id, payload, code]`) can be revived into the correct resource type without
 * needing a client-side id→type registry (which wouldn't work if the nested module isn't
 * loaded). There are only three codes and all three modules are always present in the
 * `__sveltekit/remote` barrel.
 * @type {Partial<Record<RemoteResourceCode, (id: string, payload: string, initial: PointerInitial | undefined) => any>>}
 */
const pointer_revivers = {};

/**
 * @param {RemoteResourceCode} code
 * @param {(id: string, payload: string, initial: PointerInitial | undefined) => any} reviver
 */
export function register_pointer_reviver(code, reviver) {
	pointer_revivers[code] = reviver;
}

/**
 * Build the `__skq` reviver that turns `[id, payload, code]` pointer tuples back into live
 * resources. When a `seeds` map is supplied (from a response's `queries` side-channel), a
 * matching entry is consumed and used to construct the resource directly in its
 * resolved/errored state, so it never needs to fetch.
 *
 * @param {Map<string, RemoteSingleflightEntry>} [seeds]
 * @returns {(pointer: RemotePointer) => any}
 */
export function create_remote_pointer_reviver(seeds) {
	/** @param {RemotePointer} pointer */
	const revive = (pointer) => {
		const [id, payload, code] = pointer;
		const reviver = pointer_revivers[code];

		if (!reviver) {
			throw new Error(`Cannot revive remote function pointer with unknown code "${code}"`);
		}

		/** @type {PointerInitial | undefined} */
		let initial;

		const key = create_remote_key(id, payload);
		const entry = seeds?.get(key);

		if (entry) {
			seeds?.delete(key);

			if (entry.type === 'result') {
				initial = {
					type: 'result',
					value: parse_remote_value(entry.data, app.decoders, revive),
					data: entry.data
				};
			} else {
				initial = { type: 'error', error: new HttpError(entry.status ?? 500, entry.error) };
			}
		} else {
			const serialized = unfriendly_hydratable(key, () => undefined);

			if (serialized !== undefined) {
				initial = {
					type: 'result',
					value: parse_remote_value(serialized, app.decoders, revive),
					data: serialized
				};
			}
		}

		return reviver(id, payload, initial);
	};

	return revive;
}

/**
 * Revive a serialized remote value, turning any nested `[id, payload, code]` pointers into
 * resources (seeding them from `seeds` where available, otherwise leaving them to fetch on
 * use).
 * @param {string} serialized
 * @param {Map<string, RemoteSingleflightEntry>} [seeds]
 */
export function revive_remote_value(serialized, seeds) {
	return parse_remote_value(serialized, app.decoders, create_remote_pointer_reviver(seeds));
}

/**
 * Apply the `queries` side-channel from a remote function response: live-update any queries
 * already mounted on the client, and return a `__skq` reviver that seeds the *remaining*
 * (new, not-yet-mounted) nested resources as they're revived from the result.
 *
 * @param {string | undefined} stringified_queries
 * @returns {(pointer: RemotePointer) => any}
 */
export function apply_queries(stringified_queries) {
	/** @type {Map<string, RemoteSingleflightEntry>} */
	const seeds = new Map(
		stringified_queries
			? Object.entries(
					/** @type {RemoteQueriesMap} */ (devalue.parse(stringified_queries, app.decoders))
				)
			: []
	);

	const revive = create_remote_pointer_reviver(seeds);

	for (const key of [...seeds.keys()]) {
		// may have been consumed as a nested seed while reviving another entry's value
		if (!seeds.has(key)) continue;

		const { id, payload } = split_remote_key(key);
		const live = query_map.get(id)?.get(payload);

		// not mounted — leave it in `seeds` so revival can construct a new, seeded instance
		if (!live?.resource) continue;

		const entry = /** @type {RemoteSingleflightEntry} */ (seeds.get(key));
		seeds.delete(key);

		if (entry.type === 'result') {
			live.resource.set(parse_remote_value(entry.data, app.decoders, revive));
		} else {
			live.resource.fail(new HttpError(entry.status ?? 500, entry.error));
		}
	}

	return revive;
}

/**
 * Apply the live-query `reconnects` side-channel: set the latest value on mounted live
 * queries and trigger a reconnect, or surface an error.
 *
 * @param {string} stringified_reconnects
 * @param {(pointer: RemotePointer) => any} [revive]
 */
export const apply_reconnections = (
	stringified_reconnects,
	revive = create_remote_pointer_reviver()
) => {
	const map = /** @type {RemoteQueriesMap} */ (devalue.parse(stringified_reconnects, app.decoders));

	for (const [key, entry] of Object.entries(map)) {
		const { id, payload } = split_remote_key(key);
		const live = live_query_map.get(id)?.get(payload);

		if (!live?.resource) continue;

		if (entry.type === 'result') {
			live.resource.set(parse_remote_value(entry.data, app.decoders, revive));
			void live.resource.reconnect();
		} else {
			live.resource.fail(new HttpError(entry.status ?? 500, entry.error));
		}
	}
};
