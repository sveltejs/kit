import fs from 'fs';
import path from 'path';
import { copy_assets, posixify } from '../utils.js';
import { create_app } from '../../core/create_app/index.js';
import vite from 'vite';
import svelte from '@sveltejs/vite-plugin-svelte';

/**
 * @param {{
 *   cwd: string;
 *   base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest: import('types/internal').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_entry_file: string;
 * }} options
 */
export async function build_client({
	cwd,
	base,
	config,
	manifest,
	build_dir,
	output_dir,
	client_entry_file,
	service_worker_entry_file
}) {
	create_app({
		manifest_data: manifest,
		output: build_dir,
		cwd
	});

	copy_assets(build_dir);

	process.env.VITE_SVELTEKIT_AMP = config.kit.amp ? 'true' : '';
	process.env.VITE_SVELTEKIT_SERVICE_WORKER = service_worker_entry_file ? '/service-worker.js' : '';

	const client_out_dir = `${output_dir}/client/${config.kit.appDir}`;
	const client_manifest_file = `${client_out_dir}/manifest.json`;

	/** @type {Record<string, string>} */
	const input = {
		start: path.resolve(cwd, client_entry_file)
	};

	// This step is optional — Vite/Rollup will create the necessary chunks
	// for everything regardless — but it means that entry chunks reflect
	// their location in the source code, which is helpful for debugging
	manifest.components.forEach((file) => {
		const resolved = path.resolve(cwd, file);
		const relative = path.relative(config.kit.files.routes, resolved);

		const name = relative.startsWith('..')
			? path.basename(file)
			: posixify(path.join('pages', relative));
		input[name] = resolved;
	});

	/** @type {any} */
	const user_config = config.kit.vite();

	await vite.build({
		...user_config,
		configFile: false,
		root: cwd,
		base,
		build: {
			...user_config.build,
			cssCodeSplit: true,
			manifest: true,
			outDir: client_out_dir,
			polyfillDynamicImport: false,
			rollupOptions: {
				...(user_config.build && user_config.build.rollupOptions),
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
			...user_config.resolve,
			alias: {
				...(user_config.resolve && user_config.resolve.alias),
				$app: path.resolve(`${build_dir}/runtime/app`),
				$lib: config.kit.files.lib
			}
		},
		plugins: [
			...(user_config.plugins || []),
			svelte({
				extensions: config.extensions
			})
		]
	});

	/** @type {import('./types.js').ClientManifest} */
	const client_manifest = JSON.parse(fs.readFileSync(client_manifest_file, 'utf-8'));
	fs.renameSync(client_manifest_file, `${output_dir}/manifest.json`); // inspectable but not shipped

	return client_manifest;
}
