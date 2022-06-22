import fs from 'fs';
import path from 'path';
import { deep_merge } from '../../utils/object.js';
import { print_config_conflicts } from '../config/index.js';
import { create_build, find_deps, get_default_config } from './utils.js';
import { posixify } from '../../utils/filesystem.js';

/**
 * @param {{
 *   cwd: string;
 *   config: import('types').ValidatedConfig;
 *   manifest_data: import('types').ManifestData;
 *   output_dir: string;
 *   client_entry_file: string;
 * }} options
 */
export async function build_client(options) {
	const { cwd, config, manifest_data, output_dir, client_entry_file } = options;

	process.env.VITE_SVELTEKIT_APP_VERSION = config.kit.version.name;
	process.env.VITE_SVELTEKIT_APP_VERSION_FILE = `${config.kit.appDir}/version.json`;
	process.env.VITE_SVELTEKIT_APP_VERSION_POLL_INTERVAL = `${config.kit.version.pollInterval}`;

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
	const [merged_config, conflicts] = deep_merge(
		await config.kit.vite(),
		get_default_config({ ...options, client_out_dir, input, ssr: false })
	);

	print_config_conflicts(conflicts, 'kit.vite.', 'build_client');

	const { chunks, assets } = await create_build(merged_config);

	/** @type {import('vite').Manifest} */
	const vite_manifest = JSON.parse(
		fs.readFileSync(`${client_out_dir}/immutable/manifest.json`, 'utf-8')
	);

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
