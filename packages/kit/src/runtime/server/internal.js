/** @import { SSRManifest } from '@sveltejs/kit'; */
import { restore, save } from './dev.js';

const read_implementation_key = Symbol.for('sveltekit.read_implementation');
const manifest_key = Symbol.for('sveltekit.manifest');

export let read_implementation = /** @type {((path: string) => ReadableStream<any>) | null} */ (
	(__SVELTEKIT_DEV__ && restore(read_implementation_key)) ?? null
);

export let manifest = /** @type {SSRManifest} */ (
	(__SVELTEKIT_DEV__ && restore(manifest_key)) ?? null
);

/**
 * @param {(path: string) => ReadableStream<any>} fn
 */
export function set_read_implementation(fn) {
	read_implementation = fn;
	if (__SVELTEKIT_DEV__) save(read_implementation_key, fn);
}

/**
 *
 * @param {SSRManifest} value
 */
export function set_manifest(value) {
	manifest = value;
	if (__SVELTEKIT_DEV__) save(manifest_key, value);
}

export { fix_stack_trace, set_fix_stack_trace } from './sourcemaps.js';
