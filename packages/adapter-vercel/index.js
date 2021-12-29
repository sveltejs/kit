import { writeFileSync } from 'fs';
import { relative } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

// By writing to .output, we opt in to the Vercel filesystem API:
// https://vercel.com/docs/file-system-api
const VERCEL_OUTPUT = '.output';

/** @type {import('.')} **/
export default function () {
	return {
		name: '@sveltejs/adapter-vercel',

		async adapt(builder) {
			const tmp = builder.getBuildDirectory('vercel-tmp');

			builder.rimraf(VERCEL_OUTPUT);
			builder.rimraf(tmp);

			builder.log.minor('Prerendering static pages...');
			await builder.prerender({
				dest: `${VERCEL_OUTPUT}/static`
			});

			builder.log.minor('Generating serverless function...');

			const files = fileURLToPath(new URL('./files', import.meta.url));
			const relativePath = relative(tmp, builder.getServerDirectory());

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
				outfile: `${VERCEL_OUTPUT}/server/pages/__render.js`,
				target: 'node14',
				bundle: true,
				platform: 'node'
			});

			writeFileSync(
				`${VERCEL_OUTPUT}/server/pages/package.json`,
				JSON.stringify({ type: 'commonjs' })
			);

			builder.log.minor('Copying assets...');
			builder.writeClient(`${VERCEL_OUTPUT}/static`);
			builder.writeStatic(`${VERCEL_OUTPUT}/static`);

			builder.log.minor('Writing manifests...');
			writeFileSync(
				`${VERCEL_OUTPUT}/routes-manifest.json`,
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
