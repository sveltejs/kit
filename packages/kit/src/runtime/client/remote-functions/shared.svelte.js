/** @import { RemoteQueryOverride } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
/** @import { Query } from './query.svelte.js' */
import * as devalue from 'devalue';
import { app, goto, query_map } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { untrack } from 'svelte';
import { create_remote_key, stringify_remote_arg } from '../../shared.js';
import { navigating, page } from '../state.svelte.js';

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

/** @type {Map<string, WeakRef<RemoteFunctionResource>>} */
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const prerender_resources = new Map();

/** @type {FinalizationRegistry<string> | null} */
const prerender_resource_cleanup =
	typeof FinalizationRegistry === 'undefined'
		? null
		: new FinalizationRegistry((cache_key) => {
				const ref = prerender_resources.get(cache_key);
				if (ref && ref.deref() === undefined) {
					prerender_resources.delete(cache_key);
				}
			});

/**
 * @template {(arg: { cache_key: string; payload: string }) => RemoteFunctionResource} Create
 * @template [Arg=any]
 * @param {string} id
 * @param {Create} create
 * @returns {(arg: Arg) => ReturnType<Create>}
 */
export function create_prerender_function(id, create) {
	return (arg) => {
		const payload = stringify_remote_arg(arg, app.hooks.transport);
		const cache_key = create_remote_key(id, payload);

		let resource = prerender_resources.get(cache_key)?.deref();
		if (!resource) {
			resource = create({ cache_key, payload });
			prerender_resources.set(cache_key, new WeakRef(resource));
			prerender_resource_cleanup?.register(resource, cache_key);
		}

		return /** @type {ReturnType<Create>} */ (resource);
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
