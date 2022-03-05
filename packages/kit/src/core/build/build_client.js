import fs from 'fs';
import path from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { deep_merge } from '../../utils/object.js';
import { print_config_conflicts } from '../config/index.js';
import { get_aliases } from '../utils.js';
import { create_build, find_deps } from './utils.js';
import { posixify } from '../../utils/filesystem.js';

/**
 * @param {{
 *   cwd: string;
 *   assets_base: string;
 *   config: import('types').ValidatedConfig
 *   manifest_data: import('types').ManifestData
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
	process.env.VITE_SVELTEKIT_APP_VERSION = config.kit.version.name;
	process.env.VITE_SVELTEKIT_APP_VERSION_FILE = `${config.kit.appDir}/version.json`;
	process.env.VITE_SVELTEKIT_APP_VERSION_POLL_INTERVAL = `${config.kit.version.pollInterval}`;

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
	const [merged_config, conflicts] = deep_merge(await config.kit.vite(), {
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
				// In AMP mode, we know that there are no conditional component imports. In that case, we
				// don't need to include CSS for components that are imported but unused, so we can just
				// include rendered CSS.
				// This would also apply if hydrate and router are both false, but we don't know if one
				// has been enabled at the page level, so we don't do anything there.
				emitCss: !config.kit.amp,
				compilerOptions: {
					hydratable: !!config.kit.browser.hydrate
				}
			})
		],
		// prevent Vite copying the contents of `config.kit.files.assets`,
		// if it happens to be 'public' instead of 'static'
		publicDir: false
	});

	print_config_conflicts(conflicts, 'kit.vite.', 'build_client');

	const { chunks, assets } = await create_build(merged_config);

	/** @type {import('vite').Manifest} */
	const vite_manifest = JSON.parse(fs.readFileSync(`${client_out_dir}/manifest.json`, 'utf-8'));

	const entry = posixify(client_entry_file);
	const entry_js = new Set();
	const entry_css = new Set();
	find_deps(entry, vite_manifest, entry_js, entry_css);

	fs.writeFileSync(
		`${client_out_dir}/version.json`,
		JSON.stringify({ version: process.env.VITE_SVELTEKIT_APP_VERSION })
	);

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
