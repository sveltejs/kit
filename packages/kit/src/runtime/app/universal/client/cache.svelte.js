/** @import { UniversalInternals } from '../shared.js' */
import { tick } from 'svelte';
import { universal_query_map } from '../../../client/client.js';
import { create_remote_key, stringify_remote_arg } from '../../../shared.js';
import { noop, once } from '../../../../utils/functions.js';

/**
 * @typedef {{
 *   invalidate(): Promise<void>;
 *   destroy?(): void;
 * }} UniversalResource
 */

/**
 * @template {UniversalResource} R
 * @typedef {{ resource: R, count: number, owner: UniversalInternals }} UniversalCacheEntry
 */

/** Symbol on query resources pointing at their cache key, used by `.updates(...)` */
export const UNIVERSAL_RESOURCE = Symbol('sveltekit.universal_resource');
/** Symbol on query functions pointing at their internals, used by `.updates(...)` */
export const UNIVERSAL_FUNCTION = Symbol('sveltekit.universal_function');
/** Symbol on override release functions pointing at the overridden resource, used by `.updates(...)` */
export const UNIVERSAL_OVERRIDE = Symbol('sveltekit.universal_override');

let local_id = 0;

/** @type {WeakMap<UniversalInternals, string>} */
const local_ids = new WeakMap();

/**
 * Exported universal functions get a stable id from the Vite plugin, which allows us
 * to match up the data serialized during SSR. Non-exported ones get a local id instead.
 * @param {UniversalInternals} internals
 */
export function get_id(internals) {
	if (internals.id) return internals.id;

	let id = local_ids.get(internals);
	if (!id) {
		id = `local:${++local_id}`;
		local_ids.set(internals, id);
	}

	return id;
}

/**
 * @param {UniversalInternals} internals
 * @param {any} arg
 */
export function get_key(internals, arg) {
	return create_remote_key(get_id(internals), stringify_remote_arg(arg));
}

/**
 * Get or create the resource for the given key. Calling the same universal function with the same
 * argument returns the same resource, as long as it is in use (i.e. referenced by an active effect,
 * or being awaited). Once it's no longer used, it is removed from the cache — it keeps working
 * if you hold on to it, but subsequent calls will create a new resource.
 *
 * @template {UniversalResource} R
 * @param {UniversalInternals} internals
 * @param {string} key
 * @param {() => R} create
 * @returns {R}
 */
export function get_resource(internals, key, create) {
	let entry = /** @type {UniversalCacheEntry<R> | undefined} */ (universal_query_map.get(key));

	// `owner` differs after HMR replaced the module that created the universal function
	if (!entry || entry.owner !== internals) {
		entry?.resource.destroy?.();

		const new_entry = /** @type {UniversalCacheEntry<R>} */ ({
			resource: /** @type {any} */ (null),
			count: 0,
			owner: internals
		});

		// create the resource in its own reactive root, so that its deriveds
		// aren't torn down when the component that happened to create it is destroyed
		$effect.root(() => {
			new_entry.resource = create();
		});

		universal_query_map.set(key, new_entry);
		schedule_eviction(key, new_entry);

		entry = new_entry;
	}

	pin_in_effect(key, entry);

	return entry.resource;
}

/**
 * If we're inside a reactive context, keep the resource cached for as long as the surrounding effect is alive
 * @param {string} key
 * @param {UniversalCacheEntry<any>} entry
 */
function pin_in_effect(key, entry) {
	try {
		$effect.pre(() => pin(key, entry));
	} catch {
		// not in an effect context — nothing to pin
	}
}

/**
 * @param {string} key
 * @param {UniversalCacheEntry<any>} entry
 */
function pin(key, entry) {
	entry.count++;

	return once(() => {
		entry.count--;
		schedule_eviction(key, entry);
	});
}

/**
 * Keep the resource with the given key cached until the returned function is called
 * @param {string} key
 * @param {UniversalResource} resource
 * @returns {() => void}
 */
export function pin_resource(key, resource) {
	const entry = universal_query_map.get(key);
	if (!entry || entry.resource !== resource) return noop;
	return pin(key, entry);
}

/**
 * @template {(...args: any[]) => Promise<any>} T
 * @param {string} key
 * @param {UniversalResource} resource
 * @param {T} then
 * @returns {T}
 */
export function pin_while_resolving(key, resource, then) {
	return /** @type {T} */ (
		(...args) => {
			const release = pin_resource(key, resource);
			const promise = then(...args);
			promise.then(release, release);
			return promise;
		}
	);
}

/**
 * @param {string} key
 * @param {UniversalCacheEntry<any>} entry
 */
function schedule_eviction(key, entry) {
	void tick().then(() => {
		if (entry.count > 0 || universal_query_map.get(key) !== entry) return;

		universal_query_map.delete(key);
		entry.resource.destroy?.();
	});
}

/**
 * @param {UniversalInternals} internals
 * @returns {Array<UniversalResource>} all active resources created by the given universal function
 */
export function get_resources(internals) {
	const resources = [];

	for (const entry of universal_query_map.values()) {
		if (/** @type {UniversalCacheEntry<any>} */ (entry).owner === internals) {
			resources.push(entry.resource);
		}
	}

	return resources;
}
