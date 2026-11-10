// lets a dev server in another vite environment ask the vite dev server for what only it knows
/** @import { SSRManifest } from 'types' */
import { DEV_INLINE_STYLES_PATH, DEV_SERVER_ASSETS_PATH } from '../../constants.js';

/** @type {string} */
let environment;

/** @type {Promise<string> | undefined} */
let origin;

/**
 * @param {string} name the vite environment this server runs in
 */
export function set_environment(name) {
	environment = name;
}

/**
 * loaded on first use, once the dev server is listening and knows its origin
 * @returns {Promise<string>}
 */
function get_origin() {
	return (origin ??= import('__sveltekit/dev/host').then((module) => module.origin));
}

/**
 * asks the vite dev server for the css that modules depend on, since only it has the module graph
 * @param {string[]} modules
 * @returns {Promise<Record<string, string>>}
 */
export async function inline_styles(modules) {
	/** @type {Record<string, string>} */
	const styles = {};
	if (modules.length === 0) return styles;

	const url = new URL(DEV_INLINE_STYLES_PATH, await get_origin());
	url.searchParams.set('environment', environment);
	for (const module of modules) url.searchParams.append('module', module);

	const response = await fetch(url);
	if (!response.ok) return styles;

	/** @type {Array<{ url: string; inline: string }>} */
	const dependencies = await response.json();

	for (const dependency of dependencies) {
		try {
			const module = await import(/* @vite-ignore */ dependency.inline);
			styles[dependency.url] = module.default;
		} catch {
			// this can happen with dynamically imported modules, like in the node dev server
		}
	}

	return styles;
}

/**
 * reads an imported asset from the vite dev server
 * @param {string} assets the path that asset urls start with
 * @param {string} file the path relative to the project root, or a /@fs path
 * @returns {Promise<ReadableStream | null>}
 */
export async function read_asset(assets, file) {
	const pathname = file.startsWith('/') ? assets + file : `${assets}/${file}`;
	const url = new URL(encodeURI(pathname), await get_origin());
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(
			`read(...) failed: could not fetch ${url} (${response.status} ${response.statusText})`
		);
	}

	return response.body;
}

/**
 * sizes of the assets that server modules import, which read needs for content-length
 * @type {Record<string, number>}
 */
export const server_assets = {};

/** @type {WeakSet<object>} */
const listed = new WeakSet();

/**
 * adds the sizes of the assets a server module imports to server_assets, once per module
 * instance since its imports only change when it does
 * @template {object} T
 * @param {string} id the id of the module in the vite module graph
 * @param {T} module
 * @returns {Promise<T>}
 */
export async function list_server_assets(id, module) {
	if (listed.has(module)) return module;
	listed.add(module);

	try {
		const url = new URL(DEV_SERVER_ASSETS_PATH, await get_origin());
		url.searchParams.set('environment', environment);
		url.searchParams.set('module', id);

		const response = await fetch(url);
		if (response.ok) Object.assign(server_assets, await response.json());
	} catch {
		// read still streams unlisted assets, without a content-length
	}

	return module;
}

/** @param {string} hash */
function load_remote(hash) {
	// an absolute url, so the module runner asks the vite dev server to resolve it, keep in sync
	// with DEV_REMOTE_PREFIX
	return () =>
		import(/* @vite-ignore */ `/@id/__sveltekit/dev/remote/${hash}`).then((module) =>
			list_server_assets(`\0__sveltekit/dev/remote/${hash}`, module)
		);
}

/** @param {string | symbol} hash */
const is_hash = (hash) => typeof hash === 'string' && /^[0-9a-z]+$/.test(hash);

/**
 * remote modules, looked up through the vite dev server on each call since it finds them as it
 * transforms them
 * @type {SSRManifest['remotes']}
 */
export const remotes = new Proxy(
	{},
	{
		get: (_, hash) => (is_hash(hash) ? load_remote(/** @type {string} */ (hash)) : undefined),
		getOwnPropertyDescriptor: (_, hash) =>
			is_hash(hash)
				? {
						value: load_remote(/** @type {string} */ (hash)),
						writable: false,
						enumerable: true,
						configurable: true
					}
				: undefined
	}
);
