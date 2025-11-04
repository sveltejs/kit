/** @import { RemoteQueryOverride } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
/** @import { Query } from './query.svelte.js' */
import * as devalue from 'devalue';
import { app, goto } from '../client.js';
import {
	create_remote_cache_key,
	HttpError,
	Redirect,
	REMOTE_CACHE_PREFIX
} from '@sveltejs/kit/internal';
import { stringify_remote_arg } from '../../shared.js';
import { cache } from 'svelte/reactivity';
import { query_cache } from './query-cache.js';

/**
 *
 * @param {string} url
 */
export async function remote_request(url) {
	const response = await fetch(url, {
		headers: {
			// TODO in future, when we support forking, we will likely need
			// to grab this from context as queries will run before
			// `location.pathname` is updated
			'x-sveltekit-pathname': location.pathname,
			'x-sveltekit-search': location.search
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
 * Client-version of the `query`/`prerender`/`cache` function from `$app/server`.
 * @param {string} id
 * @param {(key: string, args: string) => any} create
 */
export function create_remote_function(id, create) {
	return (/** @type {any} */ arg) => {
		const payload = stringify_remote_arg(arg, app.hooks.transport);
		const cache_key = create_remote_cache_key(id, payload);
		return cache(cache_key, () => create(cache_key, payload));
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
		const resource = query_cache.get(key.replace(REMOTE_CACHE_PREFIX, '')); // TODO should query cache treat prefixed keys as identical to unprefixed ones
		resource?.set(value);
	}
}
