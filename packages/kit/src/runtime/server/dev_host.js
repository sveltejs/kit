// lets a dev server in another vite environment ask the vite dev server for what only it knows
/** @import { SSRManifest } from 'types' */
import {
	DEV_INLINE_STYLES_PATH,
	DEV_REMOTE_PATH,
	DEV_SERVER_ASSETS_PATH
} from '../../constants.js';

/**
 * fetches json from the vite dev server, or undefined when it does not have it
 * @param {string} pathname
 * @param {Record<string, string | string[]>} params
 * @returns {Promise<any>}
 */
async function ask(pathname, params) {
	// written by the vite dev server before it serves requests
	const { origin } = await import('<sveltekit:generated>/origin.js');

	const url = new URL(pathname, origin);
	for (const [key, value] of Object.entries(params)) {
		for (const item of Array.isArray(value) ? value : [value]) url.searchParams.append(key, item);
	}

	const response = await fetch(url);
	return response.ok ? response.json() : undefined;
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

	/** @type {Array<{ url: string; inline: string }> | undefined} */
	const dependencies = await ask(DEV_INLINE_STYLES_PATH, { module: modules });

	for (const dependency of dependencies ?? []) {
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
	const { origin } = await import('<sveltekit:generated>/origin.js');
	const pathname = file.startsWith('/') ? assets + file : `${assets}/${file}`;
	const url = new URL(encodeURI(pathname), origin);
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
 * @param {string} file the path of the module
 * @param {T} module
 * @returns {Promise<T>}
 */
export async function list_server_assets(file, module) {
	if (listed.has(module)) return module;
	listed.add(module);

	try {
		Object.assign(server_assets, await ask(DEV_SERVER_ASSETS_PATH, { module: file }));
	} catch {
		// read still streams unlisted assets, without a content-length
	}

	return module;
}

/**
 * @param {string} hash
 * @returns {SSRManifest['remotes'][string]}
 */
function load_remote(hash) {
	return async () => {
		/** @type {{ file: string } | undefined} */
		const remote = await ask(DEV_REMOTE_PATH, { hash });
		if (!remote) return { default: {} };

		const module = await import(/* @vite-ignore */ remote.file);
		return { default: await list_server_assets(remote.file, module) };
	};
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
