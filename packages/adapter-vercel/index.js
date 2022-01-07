import { writeFileSync } from 'fs';
import { posix } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const dir = '.vercel_build_output';

/** @type {import('.')} **/
export default function () {
	return {
		name: '@sveltejs/adapter-vercel',

		async adapt(builder) {
			const tmp = builder.getBuildDirectory('vercel-tmp');

			builder.rimraf(dir);
			builder.rimraf(tmp);

			const files = fileURLToPath(new URL('./files', import.meta.url));

			const dirs = {
				static: `${dir}/static`,
				lambda: `${dir}/functions/node/render`
			};

			builder.log.minor('Prerendering static pages...');

			await builder.prerender({
				dest: `${dir}/static`
			});

			builder.log.minor('Generating serverless function...');

			const relativePath = posix.relative(tmp, builder.getServerDirectory());

			builder.copy(files, tmp, {
				replace: {
					APP: `${relativePath}/app.js`,
					MANIFEST: './manifest.js'
				}
			});

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath
				})};\n`
			);

			await esbuild.build({
				entryPoints: [`${tmp}/entry.js`],
				outfile: `${dirs.lambda}/index.js`,
				target: 'node14',
				bundle: true,
				platform: 'node'
			});

			writeFileSync(`${dirs.lambda}/package.json`, JSON.stringify({ type: 'commonjs' }));

			builder.log.minor('Copying assets...');

			builder.writeStatic(dirs.static);
			builder.writeClient(dirs.static);

			builder.log.minor('Writing routes...');

			builder.mkdirp(`${dir}/config`);
			writeFileSync(
				`${dir}/config/routes.json`,
				JSON.stringify([
					{
						handle: 'filesystem'
					},
					{
						src: '/.*',
						dest: '.vercel/functions/render'
					}
				])
			);
		}
	};
}
