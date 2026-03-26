/** @import { SSRManifest } from '@sveltejs/kit' */

/** @typedef {(path: string) => ReadableStream} ReadImplementation */

/**
 * @type {ReadImplementation | null}
 */
export let read_implementation = null;

/**
 * The manifest will be set when the server starts. Exporting it this way allows
 * us to access its value without having to pass it around as an argument.
 * This is especially useful for public APIs such as `read` and `match`
 */
export let manifest = /** @type {SSRManifest} */ (/** @type {unknown} */ (null));

/**
 * @param {ReadImplementation} fn
 */
export function set_read_implementation(fn) {
	read_implementation = fn;
}

/**
 * @param {SSRManifest} _
 */
export function set_manifest(_) {
	manifest = _;
}
