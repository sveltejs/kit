import { join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import * as esbuild from 'esbuild';

/**
 * @param {esbuild.BuildOptions} [options]
 */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt({ utils, config }) {
			const files = fileURLToPath(new URL('./files', import.meta.url));
			const target_dir = join(process.cwd(), '.svelte-kit', 'cloudflare');
			utils.rimraf(target_dir);

			const static_files = utils
				.copy(config.kit.files.assets, target_dir)
				.map((f) => f.replace(`${target_dir}/`, ''));

			const client_files = utils
				.copy(`${process.cwd()}/.svelte-kit/output/client`, target_dir)
				.map((f) => f.replace(`${target_dir}/`, ''));

			// returns nothing, very sad
			// TODO(future) get/save output
			await utils.prerender({
				dest: `${target_dir}/`
			});

			const static_assets = [...static_files, ...client_files];
			const assets = `const ASSETS = new Set(${JSON.stringify(static_assets)});\n`;

			const worker = readFileSync(join(files, 'worker.js'), { encoding: 'utf-8' });

			const target_worker = join(target_dir, '_worker.js');

			writeFileSync(target_worker, assets + worker);

			await esbuild.build({
				target: 'es2020',
				platform: 'browser',
				...options,
				entryPoints: [target_worker],
				outfile: target_worker,
				allowOverwrite: true,
				format: 'esm',
				bundle: true
			});
		}
	};
}
