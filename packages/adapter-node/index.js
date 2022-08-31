import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('.').default} */
export default function (opts = {}) {
	// TODO remove for 1.0
	// @ts-expect-error
	if (opts.env) {
		throw new Error(
			'options.env has been removed in favour of options.envPrefix. Consult the adapter-node README: https://github.com/sveltejs/kit/tree/master/packages/adapter-node'
		);
	}

	const { out = 'build', precompress, envPrefix = '' } = opts;

	return {
		name: '@sveltejs/adapter-node',

		async adapt(builder) {
			const tmp = builder.getBuildDirectory('adapter-node');

			builder.rimraf(out);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);

			builder.log.minor('Copying assets');
			builder.writeClient(`${out}/client`);
			builder.writePrerendered(`${out}/prerendered`);

			if (precompress) {
				builder.log.minor('Compressing assets');
				await builder.compress(`${out}/client`);
				await builder.compress(`${out}/prerendered`);
			}

			builder.log.minor('Building server');

			builder.writeServer(tmp);

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: './' })};`
			);

			const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

			await esbuild.build({
				platform: 'node',
				sourcemap: 'linked',
				target: 'es2022',
				entryPoints: [`${tmp}/index.js`, `${tmp}/manifest.js`],
				outdir: `${out}/server`,
				splitting: true,
				format: 'esm',
				bundle: true,
				external: [...Object.keys(pkg.dependencies || {})]
			});

			builder.copy(files, out, {
				replace: {
					ENV: './env.js',
					HANDLER: './handler.js',
					MANIFEST: './server/manifest.js',
					SERVER: `./server/index.js`,
					ENV_PREFIX: JSON.stringify(envPrefix)
				}
			});
		}
	};
}
