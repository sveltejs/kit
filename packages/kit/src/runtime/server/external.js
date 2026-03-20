/** @import { SSRManifest } from '@sveltejs/kit' */

/** @typedef {(path: string) => ReadableStream} ReadImplementation */

/**
 * @type {ReadImplementation | null}
 */
export let read_implementation = null;

/**
 * @type {SSRManifest | null}
 */
export let manifest = null;

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
