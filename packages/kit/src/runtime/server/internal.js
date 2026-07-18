/* eslint-disable n/prefer-global/process */
/** @import { SSRManifest } from '@sveltejs/kit'; */

/**
 * @type {((path: string) => ReadableStream<any>) | null}
 */
export let read_implementation = null;

export let manifest = /** @type {SSRManifest} */ (/** @type {unknown} */ (null));

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

export { fix_stack_trace, set_fix_stack_trace } from './sourcemaps.js';
