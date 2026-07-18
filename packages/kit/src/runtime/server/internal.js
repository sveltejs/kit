/** @import { SSRManifest } from '@sveltejs/kit'; */

/**
 * @param {Error} _error
 * @returns void
 */
export let fix_stack_trace = (_error) => {};

/**
 * @type {((path: string) => ReadableStream<any>) | null}
 */
export let read_implementation = null;

export let manifest = /** @type {SSRManifest} */ (/** @type {unknown} */ (null));

/**
 * @param {(error: Error) => void} fn
 */
export function set_fix_stack_trace(fn) {
	fix_stack_trace = fn;
}

/**
 * @param {(path: string) => ReadableStream<any>} fn
 */
export function set_read_implementation(fn) {
	read_implementation = fn;
}

/**
 *
 * @param {SSRManifest} value
 */
export function set_manifest(value) {
	manifest = value;
}
