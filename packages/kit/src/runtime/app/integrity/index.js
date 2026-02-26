import { BROWSER } from 'esm-env';
import { manifest } from '__sveltekit/server';
import { initial_base } from '$app/paths/internal/server';

/**
 * @param {string} url
 * @returns {string | undefined}
 */
function server_integrity(url) {
	const integrity_map = manifest?._.client.integrity;
	if (!integrity_map) return undefined;

	// Integrity map keys are like "_app/immutable/assets/foo.abc123.js"
	// URLs from ?url imports are absolute: "/_app/immutable/assets/foo.abc123.js"
	// or with base: "/my-base/_app/immutable/assets/foo.abc123.js"
	//
	// We use initial_base (not base) because base can be overridden to a relative
	// path during rendering when paths.relative is true, while ?url imports are
	// always absolute.
	const prefix = (initial_base || '') + '/';
	if (url.startsWith(prefix)) {
		return integrity_map[url.slice(prefix.length)];
	}

	return undefined;
}

/**
 * Look up the SRI integrity hash for a Vite-processed asset URL.
 * Returns the integrity string (e.g. `"sha384-..."`) during SSR, or `undefined` on the client / in dev.
 * @param {string} url
 * @returns {string | undefined}
 */
export function integrity(url) {
	if (BROWSER) return undefined;
	return server_integrity(url);
}
