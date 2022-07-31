import fs from 'fs';
import * as vite from 'vite';
import { get_aliases } from '../utils.js';

/**
 * @typedef {import('rollup').RollupOutput} RollupOutput
 * @typedef {import('rollup').OutputChunk} OutputChunk
 * @typedef {import('rollup').OutputAsset} OutputAsset
 */

/**
 * Invokes Vite.
 * @param {import('vite').UserConfig} config
 */
export async function create_build(config) {
	const { output } = /** @type {RollupOutput} */ (
		await vite.build({ ...config, configFile: false })
	);

	const chunks = output.filter(
		/** @returns {output is OutputChunk} */ (output) => output.type === 'chunk'
	);

	const assets = output.filter(
		/** @returns {output is OutputAsset} */ (output) => output.type === 'asset'
	);

	return { chunks, assets };
}

/**
 * Adds transitive JS and CSS dependencies to the js and css inputs.
 * @param {import('vite').Manifest} manifest
 * @param {string} entry
 * @param {boolean} add_dynamic_css
 */
export function find_deps(manifest, entry, add_dynamic_css) {
	/** @type {Set<string>} */
	const seen = new Set();

	/** @type {Set<string>} */
	const imports = new Set();

	/** @type {Set<string>} */
	const stylesheets = new Set();

	/**
	 * @param {string} file
	 * @param {boolean} add_js
	 */
	function traverse(file, add_js) {
		if (seen.has(file)) return;
		seen.add(file);

		const chunk = manifest[file];

		if (add_js) imports.add(chunk.file);

		if (chunk.css) {
			chunk.css.forEach((file) => stylesheets.add(file));
		}

		if (chunk.imports) {
			chunk.imports.forEach((file) => traverse(file, add_js));
		}

		if (add_dynamic_css && chunk.dynamicImports) {
			chunk.dynamicImports.forEach((file) => traverse(file, false));
		}
	}

	traverse(entry, true);

	return {
		file: manifest[entry].file,
		imports: Array.from(imports),
		stylesheets: Array.from(stylesheets)
	};
}

/**
 * The Vite configuration that we use by default.
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   input: Record<string, string>;
 *   ssr: boolean;
 *   outDir: string;
 * }} options
 * @return {import('vite').UserConfig}
 */
export const get_default_config = function ({ config, input, ssr, outDir }) {
	const prefix = `${config.kit.appDir}/immutable`;

	return {
		appType: 'custom',
		base: ssr ? assets_base(config.kit) : './',
		build: {
			cssCodeSplit: true,
			manifest: true,
			outDir,
			polyfillModulePreload: false,
			rollupOptions: {
				input,
				output: {
					format: 'esm',
					entryFileNames: ssr ? '[name].js' : `${prefix}/[name]-[hash].js`,
					chunkFileNames: ssr ? 'chunks/[name].js' : `${prefix}/chunks/[name]-[hash].js`,
					// assetFileNames is the same for ssr/client/workers because we're not actually
					// outputting the assets in SSR mode, but they need to point to the same place
					assetFileNames: `${prefix}/assets/[name]-[hash][extname]`
				},
				preserveEntrySignatures: 'strict'
			},
			ssr,
			target: ssr ? 'node14.8' : undefined
		},
		define: {
			__SVELTEKIT_ADAPTER_NAME__: JSON.stringify(config.kit.adapter?.name),
			__SVELTEKIT_APP_VERSION__: JSON.stringify(config.kit.version.name),
			__SVELTEKIT_APP_VERSION_FILE__: JSON.stringify(`${config.kit.appDir}/version.json`),
			__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: JSON.stringify(config.kit.version.pollInterval),
			__SVELTEKIT_DEV__: 'false'
		},
		publicDir: ssr ? false : config.kit.files.assets,
		resolve: {
			alias: get_aliases(config.kit)
		},
		ssr: {
			// when developing against the Kit src code, we want to ensure that
			// our dependencies are bundled so that apps don't need to install
			// them as peerDependencies
			noExternal: process.env.BUNDLED
				? []
				: Object.keys(
						JSON.parse(fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8'))
							.devDependencies
				  )
		},
		worker: {
			rollupOptions: {
				output: {
					entryFileNames: `${prefix}/workers/[name]-[hash].js`,
					chunkFileNames: `${prefix}/workers/chunks/[name]-[hash].js`
				}
			}
		}
	};
};

/**
 * @param {import('types').ValidatedKitConfig} config
 * @returns {string}
 */
export function assets_base(config) {
	return config.paths.assets || config.paths.base || './';
}

/**
 * vite.config.js will contain vite-plugin-svelte-kit, which kicks off the server and service
 * worker builds in a hook. When running the server and service worker builds we must remove
 * the SvelteKit plugin so that we do not kick off additional instances of these builds.
 * @param {import('vite').UserConfig} config
 */
export function remove_svelte_kit(config) {
	// TODO i feel like there's a more elegant way to do this
	// @ts-expect-error - it can't handle infinite type expansion
	config.plugins = (config.plugins || [])
		.flat(Infinity)
		.filter((plugin) => plugin.name !== 'vite-plugin-svelte-kit');
}

const method_names = new Set(['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH']);

// If we'd written this in TypeScript, it could be easy...
/**
 * @param {string} str
 * @returns {str is import('types').HttpMethod}
 */
export function is_http_method(str) {
	return method_names.has(str);
}
