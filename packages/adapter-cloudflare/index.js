import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

/** @type {import('.')} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			const files = fileURLToPath(new URL('./files', import.meta.url));
			const dest = join(process.cwd(), '.svelte-kit', 'cloudflare');
			builder.rimraf(dest);

			builder.writeStatic(dest);
			builder.writeClient(dest);

			const { paths } = await builder.prerender({ dest });

			const tmp = join(process.cwd(), '.svelte-kit', 'cloudflare-tmp');
			builder.mkdirp(tmp);

			writeFileSync(
				join(tmp, 'manifest.js'),
				`export const manifest = ${builder.generateManifest({
					relativePath: '../output/server'
				})};\n\nexport const prerendered = new Set(${JSON.stringify(paths)});\n`
			);

			const worker = join(dest, '_worker.js');

			builder.copy(join(files, 'worker.js'), worker);

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
