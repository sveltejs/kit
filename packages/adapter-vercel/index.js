import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/** @type {import('.')} **/
export default function (options) {
	return {
		name: '@sveltejs/adapter-vercel',

		async adapt({ utils }) {
			const dir = '.output';
			utils.rimraf(dir);

			const files = fileURLToPath(new URL('./files', import.meta.url));

			const dirs = {
				static: join(dir, 'static'),
				pages: join(dir, 'server/pages')
			};

			// TODO ideally we'd have something like utils.tmpdir('vercel')
			// rather than hardcoding '.svelte-kit/vercel/entry.js', and the
			// relative import from that file to output/server/app.js
			// would be controlled. at the moment we're exposing
			// implementation details that could change
			utils.log.minor('Generating serverless function...');
			utils.copy(join(files, 'entry.js'), '.svelte-kit/vercel/entry.js');

			const assets = new Set([...utils.build_data.static, ...utils.build_data.client]);

			utils.build_data.static.forEach((file) => {
				if (file.endsWith('/index.html')) {
					assets.add(file.slice(0, -11));
				}
			});

			writeFileSync(
				'.svelte-kit/vercel/assets.js',
				`export const assets = new Set(${JSON.stringify([...assets])});`
			);

			/** @type {BuildOptions} */
			const default_options = {
				entryPoints: ['.svelte-kit/vercel/entry.js'],
				outfile: join(dirs.pages, '_middleware.js'),
				bundle: true,
				platform: 'node'
			};

			const build_options =
				options && options.esbuild ? await options.esbuild(default_options) : default_options;

			await esbuild.build(build_options);

			utils.log.minor('Prerendering static pages...');
			await utils.prerender({
				dest: dirs.pages
			});

			utils.log.minor('Copying assets...');
			utils.copy_static_files(dirs.static);
			utils.copy_client_files(dirs.static);

			utils.log.minor('Writing functions manifest...');
			utils.copy(join(files, 'functions-manifest.json'), join(dir, 'functions-manifest.json'));
		}
	};
}
