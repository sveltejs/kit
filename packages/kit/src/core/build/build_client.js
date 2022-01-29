import fs from 'fs';
import path from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { deep_merge } from '../../utils/object.js';
import { print_config_conflicts } from '../config/index.js';
import { create_app } from '../create_app/index.js';
import { copy_assets, get_aliases } from '../utils.js';
import { create_build, find_deps } from './utils.js';
import { SVELTE_KIT } from '../constants.js';
import { posixify } from '../../utils/filesystem.js';

/**
 * @param {{
 *   cwd: string;
 *   assets_base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest_data: import('types/internal').ManifestData
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_entry_file: string | null;
 *   service_worker_register: boolean;
 * }} options
 */
export async function build_client({
	cwd,
	assets_base,
	config,
	manifest_data,
	output_dir,
	client_entry_file
}) {
	create_app({
		manifest_data,
		output: `${SVELTE_KIT}/generated`,
		cwd
	});

	copy_assets(`${SVELTE_KIT}/runtime`);

	process.env.VITE_SVELTEKIT_AMP = config.kit.amp ? 'true' : '';

	const client_out_dir = `${output_dir}/client/${config.kit.appDir}`;

	/** @type {Record<string, string>} */
	const input = {
		start: path.resolve(cwd, client_entry_file)
	};

	// This step is optional — Vite/Rollup will create the necessary chunks
	// for everything regardless — but it means that entry chunks reflect
	// their location in the source code, which is helpful for debugging
	manifest_data.components.forEach((file) => {
		const resolved = path.resolve(cwd, file);
		const relative = path.relative(config.kit.files.routes, resolved);

		const name = relative.startsWith('..')
			? path.basename(file)
			: posixify(path.join('pages', relative));
		input[name] = resolved;
	});

	/** @type {[any, string[]]} */
	const [merged_config, conflicts] = deep_merge(config.kit.vite(), {
		configFile: false,
		root: cwd,
		base: assets_base,
		build: {
			cssCodeSplit: true,
			manifest: true,
			outDir: client_out_dir,
			polyfillDynamicImport: false,
			rollupOptions: {
				input,
				output: {
					entryFileNames: '[name]-[hash].js',
					chunkFileNames: 'chunks/[name]-[hash].js',
					assetFileNames: 'assets/[name]-[hash][extname]'
				},
				preserveEntrySignatures: 'strict'
			}
		},
		resolve: {
			alias: get_aliases(config)
		},
		plugins: [
			svelte({
				extensions: config.extensions,
				emitCss: !config.kit.amp,
				compilerOptions: {
					hydratable: !!config.kit.browser.hydrate
				}
			})
		]
	});

	print_config_conflicts(conflicts, 'kit.vite.', 'build_client');

	const { chunks, assets } = await create_build(merged_config);

	/** @type {import('vite').Manifest} */
	const vite_manifest = JSON.parse(fs.readFileSync(`${client_out_dir}/manifest.json`, 'utf-8'));

	const entry = posixify(client_entry_file);
	const entry_js = new Set();
	const entry_css = new Set();
	find_deps(entry, vite_manifest, entry_js, entry_css);

	return {
		assets,
		chunks,
		entry: {
			file: vite_manifest[entry].file,
			js: Array.from(entry_js),
			css: Array.from(entry_css)
		},
		vite_manifest
	};
}
