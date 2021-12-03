import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/** @type {import('.')} **/
export default function () {
	return {
		name: '@sveltejs/adapter-vercel',

		async adapt(builder) {
			const dir = '.output';
			builder.rimraf(dir);

			const files = fileURLToPath(new URL('./files', import.meta.url));

			const dirs = {
				static: join(dir, 'static'),
				lambda: join(dir, 'server/pages')
			};

			builder.log.minor('Prerendering static pages...');
			await builder.prerender({
				dest: dirs.static
			});

			// TODO ideally we'd have something like builder.tmpdir('vercel')
			// rather than hardcoding '.svelte-kit/vercel/entry.js', and the
			// relative import from that file to output/server/app.js
			// would be controlled. at the moment we're exposing
			// implementation details that could change
			builder.log.minor('Generating serverless function...');
			builder.copy(files, '.svelte-kit/vercel', {
				replace: {
					APP: '../output/server/app.js',
					MANIFEST: './manifest.js'
				}
			});

			writeFileSync(
				'.svelte-kit/vercel/manifest.js',
				`export const manifest = ${builder.generateManifest({
					relativePath: '../output/server'
				})};\n`
			);

			await esbuild.build({
				entryPoints: ['.svelte-kit/vercel/entry.js'],
				outfile: join(dirs.lambda, '__render.js'),
				target: 'node14',
				bundle: true,
				platform: 'node'
			});

			writeFileSync(join(dirs.lambda, 'package.json'), JSON.stringify({ type: 'commonjs' }));

			builder.log.minor('Copying assets...');
			builder.writeClient(dirs.static);
			builder.writeStatic(dirs.static);

			builder.log.minor('Writing manifests...');
			writeFileSync(
				join(dir, 'routes-manifest.json'),
				JSON.stringify({
					version: 3,
					dynamicRoutes: [
						{
							page: '/__render',
							regex: '^/.*'
						}
					]
				})
			);
		}
	};
}
