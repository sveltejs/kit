/** @import { RemoteQueryOverride } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
/** @import { Query } from './query.svelte.js' */
import * as devalue from 'devalue';
import { app, goto, query_map, redirect_fork } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { getContext, untrack } from 'svelte';
import { navigating, page } from '../state.svelte.js';

/** @typedef {import('svelte').Fork & { discarded: boolean; committed: boolean }} SvelteKitFork */

/** @type {Map<string, Map<SvelteKitFork | null, number>>} */
const forks_by_key = new Map();

/**
 * @returns {() => SvelteKitFork | null}
 */
function get_fork_context() {
	try {
		return getContext('__sveltekit_fork');
	} catch {
		return () => null;
	}
}

/**
 * @param {string} key
 * @returns {() => void}
 */
export function register_fork(key) {
	const get_fork = get_fork_context()();
	const instances = forks_by_key.get(key) ?? new Map();

	instances.set(get_fork, (instances.get(get_fork) ?? 0) + 1);
	forks_by_key.set(key, instances);

	return () => {
		const current = forks_by_key.get(key);
		if (!current) return;

		const count = current.get(get_fork);
		if (count === undefined) return;

		if (count > 1) {
			current.set(get_fork, count - 1);
		} else {
			current.delete(get_fork);
		}

		if (current.size === 0) {
			forks_by_key.delete(key);
		}
	};
}

/**
 * @param {string} key
 * @param {string} location
 */
export async function handle_remote_redirect(key, location) {
	const forks = forks_by_key.get(key) ?? new Map();
	let target;

	for (const fork of forks.keys()) {
		if (!fork || fork.committed) {
			await goto(location);
			throw new Redirect(307, location);
		} else if (!fork.discarded) {
			target = fork;
		}
	}

	if (target) {
		await redirect_fork(target, location);
		// This request happened in a speculative fork and has been routed through the fork loader.
		// Keep the promise pending to avoid turning the redirect into a render error in the current world.
		// TODO this is a Svelte bug we need to fix that
		return new Promise(() => {});
	}

	await goto(location);
	throw new Redirect(307, location);
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
 * @param {string} key
 */
export async function remote_request(url, headers, key) {
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
		return handle_remote_redirect(key, result.location);
	}

	if (result.type === 'error') {
		throw new HttpError(result.status ?? 500, result.error);
	}

	return result.result;
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
 * @returns {boolean} Returns `true` if we are in an effect
 */
export function is_in_effect() {
	try {
		$effect.pre(() => {});
		return true;
	} catch {
		return false;
	}
}
