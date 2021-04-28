import { join } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

/**
 * @param {{
 *   out?: string;
 *   deps?: string;
 * }} options
 */
export default function ({
	out = 'build',
	deps = fileURLToPath(new URL('./deps.ts', import.meta.url))
} = {}) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-deno',

		async adapt(utils) {
			const dirs = {
				files: fileURLToPath(new URL('./files', import.meta.url)),
				server: join('.svelte-kit', 'output', 'server'),
				static: join(out, 'assets')
			};

			utils.log.minor('Copying assets');
			utils.copy_client_files(dirs.static);
			utils.copy_static_files(dirs.static);

			utils.log.minor('Bundling application server');
			await esbuild.build({
				entryPoints: [join(dirs.server, 'app.js')],
				outfile: join(out, 'app.js'),
				bundle: true,
				// platform: 'browser'
				platform: 'neutral',
				sourcemap: 'external'
			});

			utils.log.minor('Copying server files');
			utils.copy(dirs.files, out);

			utils.log.minor(`Copying deps.ts: ${deps}`);
			utils.copy(deps, join(out, 'deps.ts'));

			utils.log.minor('Prerendering static pages');
			await utils.prerender({
				dest: `${out}/prerendered`
			});
		}
	};

	return adapter;
}
