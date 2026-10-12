/** @import { ServerHooks, SSRManifest } from 'types'; */
import { restore, save } from './dev.js';
import { stream_from_iterable } from '../utils.js';
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
const hooks_key = Symbol.for('sveltekit.hooks');

export let read_implementation = /** @type {((path: string) => ReadableStream<any>) | null} */ (
	(__SVELTEKIT_DEV__ && restore(read_implementation_key)) ?? null
);

export let manifest = /** @type {SSRManifest} */ (
	(__SVELTEKIT_DEV__ && restore(manifest_key)) ?? null
);

export let hooks = /** @type {ServerHooks} */ ((__SVELTEKIT_DEV__ && restore(hooks_key)) ?? null);

/**
 * The public `read` may return a promise, the runtime expects a stream
 * @param {NonNullable<import('@sveltejs/kit').ServerInitOptions['read']>} read
 */
export function set_read_implementation(read) {
	read_implementation = (file) => {
		const result = read(file);
		if (result instanceof ReadableStream) return result;

		return stream_from_iterable(
			(async function* () {
				const stream = await result;
				if (stream) yield* stream;
			})()
		);
	};
	if (__SVELTEKIT_DEV__) save(read_implementation_key, read_implementation);
}

/**
 *
 * @param {SSRManifest} value
 */
export function set_manifest(value) {
	manifest = value;
	if (__SVELTEKIT_DEV__) save(manifest_key, value);
}

/** @type {import('types').ServerConfigureOptions['read_static']} */
export let read_static;

/** @type {import('types').ServerConfigureOptions['before_handle']} */
export let before_handle;

/** @type {import('types').ServerConfigureOptions['emulator']} */
export let emulator;

/**
 * What the process hosting the runtime lends it, set on every `configure`
 * @param {import('types').ServerConfigureOptions} opts
 */
export function set_host(opts) {
	({ read_static, before_handle, emulator } = opts);
}

/**
 * @param {ServerHooks} value
 */
export function set_hooks(value) {
	hooks = value;
	if (__SVELTEKIT_DEV__) save(hooks_key, value);
}

/**
 * @param {number} status
 * @param {Request} request
 * @returns {string}
 */
export function format_response(status, request) {
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
		const id = /** @type {string} */ (strip_remote_prefix(url));
		const [file_hash, name, arg_hash] = id.split('/');

		log += styleText('dim', `${url.pathname.slice(0, -id.length)}${file_hash}/`) + name;
		if (arg_hash) log += styleText('dim', `/${arg_hash}`);
		if (url.search) log += styleText('dim', url.search);
	} else {
		log += requested;
	}

	return log;
}

export { fix_stack_trace, set_fix_stack_trace } from './sourcemaps.js';
