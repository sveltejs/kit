import { join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as esbuild from 'esbuild';

/**
 * @param {esbuild.BuildOptions} [options]
 */
export default function (options = {}) {
	return {
		name: 'cloudflare-pages-adapter',
		async adapt({ utils, config }) {
			const files = fileURLToPath(new URL('./', import.meta.url));
			const target_dir = join(process.cwd(), '.svelte-kit', 'cf-pages');
			const target_client = join(target_dir, 'client');
			utils.rimraf(target_dir);

			const static_files = utils
				.copy(config.kit.files.assets, target_client)
				.map((f) => f.replace(`${target_client}/`, ''));

			const client_files = utils
				.copy(`${process.cwd()}/.svelte-kit/output/client`, target_client)
				.map((f) => f.replace(`${target_client}/`, ''));

			// needs testing to see if thi is worth it
			const prerendered = await utils.prerender({
				dest: `${target_client}/`
			});

			const static_assets = [...static_files, ...client_files];
			const assets = `const ASSETS = new Set(${JSON.stringify(static_assets)});\n`;

			const worker = readFileSync(join(files, 'worker.js'), { encoding: 'utf-8' });

			mkdirSync(join(target_dir, '_tmp'));
			writeFileSync(join(target_dir, '_tmp', 'server.js'), assets + worker);

			await esbuild.build({
				...options,
				entryPoints: [`${target_dir}/_tmp/server.js`],
				outfile: `${target_dir}/server.js`,
				bundle: true,
				format: 'esm',
				target: 'es2020',
				platform: 'browser'
			});
		}
	};
}
