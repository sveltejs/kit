import { join } from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

/** @type {import('.')} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(utils) {
			const files = fileURLToPath(new URL('./files', import.meta.url));
			const dest = join(process.cwd(), '.svelte-kit', 'cloudflare');
			utils.rimraf(dest);

			utils.writeStatic(dest);
			utils.writeClient(dest);

			// returns nothing, very sad
			// TODO(future) get/save output
			await utils.prerender({ dest });

			const worker = join(dest, '_worker.js');

			utils.copy(join(files, 'worker.js'), worker);

			await esbuild.build({
				target: 'es2020',
				platform: 'browser',
				...options,
				entryPoints: [worker],
				outfile: worker,
				allowOverwrite: true,
				format: 'esm',
				bundle: true
			});
		}
	};
}
