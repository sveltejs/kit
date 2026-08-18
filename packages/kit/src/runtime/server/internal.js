/** @import { SSRManifest } from 'types'; */
import { restore, save } from './dev.js';
import {
	has_data_suffix,
	has_resolution_suffix,
	strip_data_suffix,
	strip_resolution_suffix
} from '../../pathname.js';
import { has_remote_prefix, strip_remote_prefix } from '../../runtime/server/remote-functions.js';

// using `getBuiltinModule` rather than `import` makes this safe to run in non-Node-compatible environments
const styleText =
	// eslint-disable-next-line n/prefer-global/process
	globalThis.process?.getBuiltinModule?.('node:util')?.styleText ??
	/** @type {(format: unknown, text: string) => string} */ ((_format, text) => text);

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

/**
 * @param {number} status
 * @param {Request} request
 */
export function log_response(status, request) {
	const url = new URL(request.url);
	const requested = url.href.replace(url.origin, '');

	let log = `${styleText(status < 400 ? ['cyan'] : ['bold', 'red'], `${status}`)} ${request.method} `;

	if (has_data_suffix(url.pathname)) {
		const pathname = strip_data_suffix(url.pathname) || '/';
		log += pathname + styleText('dim', requested.slice(pathname.length));
	} else if (has_resolution_suffix(url.pathname)) {
		const pathname = strip_resolution_suffix(url.pathname) || '/';
		log += pathname + styleText('dim', requested.slice(pathname.length));
	} else if (has_remote_prefix(url)) {
		const id = /** @type {string} */ (strip_remote_prefix(url).split('/').pop());
		log += styleText('dim', url.pathname.slice(0, -id.length)) + id + styleText('dim', url.search);
	} else {
		log += requested;
	}

	console.log(log);
}

export { fix_stack_trace, set_fix_stack_trace } from './sourcemaps.js';
