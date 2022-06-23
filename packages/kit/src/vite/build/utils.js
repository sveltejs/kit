import * as vite from 'vite';
import { get_aliases } from '../../core/utils.js';

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
	const { output } = /** @type {RollupOutput} */ (await vite.build(config));

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
 * @param {string} file
 * @param {import('vite').Manifest} manifest
 * @param {Set<string>} css
 * @param {Set<string>} js
 */
export function find_deps(file, manifest, js, css) {
	const chunk = manifest[file];

	if (js.has(chunk.file)) return;
	js.add(chunk.file);

	if (chunk.css) {
		chunk.css.forEach((file) => css.add(file));
	}

	if (chunk.imports) {
		chunk.imports.forEach((file) => find_deps(file, manifest, js, css));
	}
}

/**
 * The Vite configuration that we use by default.
 * @param {{
 *   client_out_dir?: string;
 *   config: import('types').ValidatedConfig;
 *   input: Record<string, string>;
 *   output_dir: string;
 *   ssr: boolean;
 * }} options
 * @return {import('vite').UserConfig}
 */
export const get_default_config = function ({ client_out_dir, config, input, output_dir, ssr }) {
	return {
		base: assets_base(config.kit),
		build: {
			cssCodeSplit: true,
			manifest: true,
			outDir: ssr ? `${output_dir}/server` : `${client_out_dir}/immutable`,
			polyfillDynamicImport: false,
			rollupOptions: {
				input,
				output: {
					format: 'esm',
					entryFileNames: ssr ? '[name].js' : '[name]-[hash].js',
					chunkFileNames: 'chunks/[name]-[hash].js',
					assetFileNames: 'assets/[name]-[hash][extname]'
				},
				preserveEntrySignatures: 'strict'
			},
			ssr
		},
		// prevent Vite copying the contents of `config.kit.files.assets`,
		// if it happens to be 'public' instead of 'static'
		publicDir: false,
		resolve: {
			alias: get_aliases(config.kit)
		}
	};
};

/**
 * @param {import('types').ValidatedKitConfig} config
 * @returns {string}
 */
export function assets_base(config) {
	// TODO this is so that Vite's preloading works. Unfortunately, it fails
	// during `svelte-kit preview`, because we use a local asset path. This
	// may be fixed in Vite 3: https://github.com/vitejs/vite/issues/2009
	const { base, assets } = config.paths;
	return `${assets || base}/${config.appDir}/immutable/`;
}

/**
 * @param {import('vite').UserConfig} config
 * @param {boolean} [add_svelte]
 */
export function ensure_plugins(config, add_svelte) {
	// @ts-expect-error - it can't handle infinite type expansion
	config.plugins = (config.plugins || []).flat(Infinity);
	let has_svelte_plugin = false;
	for (let i = config.plugins.length - 1; i > 0; i--) {
		const plugin = config.plugins[i];
		// @ts-expect-error - it doesn't know about the `flat` call we just made
		if (plugin?.name === 'vite-plugin-svelte-kit') {
			config.plugins.splice(i, 1);
			// @ts-expect-error - it doesn't know about the `flat` call we just made
		} else if (plugin?.name === 'vite-plugin-svelte') {
			has_svelte_plugin = true;
		}
	}
	if (add_svelte && !has_svelte_plugin && !process.env.SVELTE_VITE_CONFIG) {
		config.plugins.push(svelte({}));
	}
}
