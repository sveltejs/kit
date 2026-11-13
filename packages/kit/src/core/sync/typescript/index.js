/** @import { TsFacade } from './facade.js' */
import * as w from '../../../messages/build-warnings.js';
import { create_ts6_facade } from './ts6.js';
import { create_ts7_facade } from './ts7.js';

/**
 * The TypeScript API that `sync` uses, or `undefined` if the user has not installed TypeScript.
 * It's typed as defined so that code that checked this once doesn't need to repeat it
 * @type {TsFacade}
 */
export let ts = /** @type {TsFacade} */ (await load_typescript());

/**
 * Sets the TypeScript API that `sync` uses. Only exported for tests
 * @param {TsFacade | undefined} facade
 */
export function set_typescript(facade) {
	ts = /** @type {TsFacade} */ (facade);
}

/**
 * Loads TypeScript and creates the facade implementation for its version
 * @param {string} [name] The package to load TypeScript from
 * @returns {Promise<TsFacade | undefined>} `undefined` if the package is not installed, or not supported
 */
export async function load_typescript(name = 'typescript') {
	/** @type {{ version?: string } | undefined} */
	let typescript;

	try {
		typescript = (await import_package(name)).default;
	} catch {
		// The user has not installed TypeScript
		return;
	}

	const version = typescript?.version ?? 'unknown';
	const [major, minor] = version.split('.').map(Number);

	if (major < 7) {
		return create_ts6_facade(/** @type {typeof import('typescript')} */ (typescript));
	}

	if (major === 7 && minor < 1) {
		w.typescript_unsupported({ version, details: 'SvelteKit needs TypeScript 7.1 or later' });
		return;
	}

	try {
		// The main export of TypeScript 7 only contains its version, its API is in these modules
		const [sync, ast] = await Promise.all([
			import_package(`${name}/sync`),
			import_package(`${name}/ast`)
		]);

		return create_ts7_facade({ sync, ast });
	} catch (error) {
		w.typescript_unsupported({ version, details: /** @type {Error} */ (error).message });
	}
}

/**
 * @param {string} specifier
 * @returns {Promise<any>}
 */
function import_package(specifier) {
	// eslint-disable-next-line kit-node-custom/require-path-to-file-url -- bare package specifier, not a path
	return import(/* @vite-ignore */ specifier);
}
