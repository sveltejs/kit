/** @import { UniversalResource } from './cache.svelte.js' */
import {
	UNIVERSAL_FUNCTION,
	UNIVERSAL_OVERRIDE,
	UNIVERSAL_RESOURCE,
	get_resources
} from './cache.svelte.js';

/**
 * Given the arguments passed to `.updates(...)` (query instances, query functions or override release functions),
 * figure out which resources need to be refreshed after the mutation completes, and which overrides need to be released.
 *
 * Since everything runs in the same environment, there's no single-flight mutation magic necessary:
 * we simply re-run the affected queries after the mutation completes.
 *
 * @param {any[]} updates
 * @returns {{ overrides: Array<() => void>, resources: Set<UniversalResource> }}
 */
export function categorize_updates(updates) {
	/** @type {Array<() => void>} */
	const overrides = [];

	/** @type {Set<UniversalResource>} */
	const resources = new Set();

	for (const update of updates) {
		if (typeof update === 'function') {
			if (Object.hasOwn(update, UNIVERSAL_FUNCTION)) {
				// a query function — refresh all of its active instances
				for (const resource of get_resources(update[UNIVERSAL_FUNCTION])) {
					resources.add(resource);
				}
			} else if (Object.hasOwn(update, UNIVERSAL_OVERRIDE)) {
				// an override — refresh the query, then release the override
				resources.add(update[UNIVERSAL_OVERRIDE]);
				overrides.push(update);
			} else {
				// some other function provided by a user integration, treated as an override release
				overrides.push(update);
			}

			continue;
		}

		if (
			typeof update === 'object' &&
			update !== null &&
			Object.hasOwn(update, UNIVERSAL_RESOURCE)
		) {
			resources.add(update);
			continue;
		}

		throw new Error(
			'Invalid argument passed to `.updates(...)`. Expected a universal query, query function or override'
		);
	}

	return { overrides, resources };
}

/**
 * @param {Set<UniversalResource>} resources
 */
export async function refresh_resources(resources) {
	await Promise.all(Array.from(resources, (resource) => resource.invalidate()));
}
