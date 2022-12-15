import fs from 'fs';
import path from 'path';
import * as vite from 'vite';
import { get_config_aliases, get_app_aliases } from '../utils.js';

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

	/** @type {Set<string>} */
	const fonts = new Set();

	/**
	 * @param {string} current
	 * @param {boolean} add_js
	 */
	function traverse(current, add_js) {
		if (seen.has(current)) return;
		seen.add(current);

		const { chunk } = resolve_symlinks(manifest, current);

		if (add_js) imports.add(chunk.file);

		if (chunk.assets) {
			for (const asset of chunk.assets) {
				if (/\.(woff2?|ttf|otf)$/.test(asset)) {
					fonts.add(asset);
				}
			}
		}

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

	const { chunk, file } = resolve_symlinks(manifest, entry);

	traverse(file, true);

	return {
		file: chunk.file,
		imports: Array.from(imports),
		stylesheets: Array.from(stylesheets),
		fonts: Array.from(fonts)
	};
}

/**
 * @param {import('vite').Manifest} manifest
 * @param {string} file
 */
export function resolve_symlinks(manifest, file) {
	while (!manifest[file]) {
		file = path.relative('.', fs.realpathSync(file));
	}

	const chunk = manifest[file];

	return { chunk, file };
}

/**
 * Partial Vite configuration that we use by default for setting up the build.
 * Can be used in a non-SvelteKit Vite server and build process such as Storybook.
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   ssr: boolean;
 * }} options
 * @return {import('vite').UserConfig}
 */
export function get_build_setup_config({ config, ssr }) {
	return {
		build: {
			// don't use the default name to avoid collisions with 'static/manifest.json'
			manifest: 'vite-manifest.json',
			ssr
		},
		define: {
			__SVELTEKIT_ADAPTER_NAME__: JSON.stringify(config.kit.adapter?.name),
			__SVELTEKIT_APP_VERSION_FILE__: JSON.stringify(`${config.kit.appDir}/version.json`),
			__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: JSON.stringify(config.kit.version.pollInterval),
			__SVELTEKIT_EMBEDDED__: config.kit.embedded ? 'true' : 'false'
		},
		resolve: {
			alias: [...get_app_aliases(config.kit), ...get_config_aliases(config.kit)]
		},
		optimizeDeps: {
			exclude: ['@sveltejs/kit']
		},
		ssr: {
			noExternal: [
				// TODO document why this is necessary
				'@sveltejs/kit',
				// This ensures that esm-env is inlined into the server output with the
				// export conditions resolved correctly through Vite. This prevents adapters
				// that bundle later on to resolve the export conditions incorrectly
				// and for example include browser-only code in the server output
				// because they for example use esbuild.build with `platform: 'browser'`
				'esm-env'
			]
		}
	};
}

/**
 * Partial Vite configuration that we use by default for setting up the build.
 * Cannot be used in a non-SvelteKit Vite server and build process such as Storybook.
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   input: Record<string, string>;
 *   ssr: boolean;
 *   outDir: string;
 * }} options
 * @return {import('vite').UserConfig}
 */
export function get_build_compile_config({ config, input, ssr, outDir }) {
	const prefix = `${config.kit.appDir}/immutable`;

	return {
		appType: 'custom',
		base: ssr ? assets_base(config.kit) : './',
		build: {
			cssCodeSplit: true,
			outDir,
			rollupOptions: {
				input,
				output: {
					format: 'esm',
					entryFileNames: ssr ? '[name].js' : `${prefix}/[name]-[hash].js`,
					chunkFileNames: ssr ? 'chunks/[name].js' : `${prefix}/chunks/[name]-[hash].js`,
					assetFileNames: `${prefix}/assets/[name]-[hash][extname]`,
					hoistTransitiveImports: false
				},
				preserveEntrySignatures: 'strict'
			},
			target: ssr ? 'node16.14' : undefined
		},
		publicDir: ssr ? false : config.kit.files.assets,
		worker: {
			rollupOptions: {
				output: {
					entryFileNames: `${prefix}/workers/[name]-[hash].js`,
					chunkFileNames: `${prefix}/workers/chunks/[name]-[hash].js`,
					hoistTransitiveImports: false
				}
			}
		}
	};
}

/**
 * The Vite configuration that we use by default for building.
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   input: Record<string, string>;
 *   ssr: boolean;
 *   outDir: string;
 * }} options
 * @return {import('vite').UserConfig}
 */
export function get_default_build_config(options) {
	return vite.mergeConfig(get_build_setup_config(options), get_build_compile_config(options));
}

/**
 * @param {import('types').ValidatedKitConfig} config
 * @returns {string}
 */
export function assets_base(config) {
	return (config.paths.assets || config.paths.base || '.') + '/';
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
