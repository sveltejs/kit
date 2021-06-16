import esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

/**
 * @param {{
 *   out?: string;
 * }} options
 */
export default function ({ out = 'build' } = {}) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-node',

		async adapt({ utils, config }) {
			utils.log.minor('Copying assets');
			const static_directory = join(out, 'assets');
			utils.copy_client_files(static_directory);
			utils.copy_static_files(static_directory);

			utils.log.minor('Building server');
			const files = fileURLToPath(new URL('./files', import.meta.url));
			utils.copy(files, '.svelte-kit/node');
			await esbuild.build({
				entryPoints: ['.svelte-kit/node/index.js'],
				outfile: join(out, 'index.js'),
				bundle: true,
				external: Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).dependencies || {}),
				format: 'esm',
				platform: 'node',
				target: 'node12',
				define: {
					esbuild_app_dir: '"' + config.kit.appDir + '"'
				}
			});

			utils.log.minor('Prerendering static pages');
			await utils.prerender({
				dest: `${out}/prerendered`
			});
		}
	};

	return adapter;
}
