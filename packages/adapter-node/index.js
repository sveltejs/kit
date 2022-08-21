import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

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
			builder.rimraf(out);

			builder.log.minor('Copying assets');
			builder.writeClient(`${out}/client`);
			builder.writeServer(`${out}/server`);
			builder.writePrerendered(`${out}/prerendered`);

			writeFileSync(
				`${out}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath: './server'
				})};\n`
			);

			builder.copy(files, out, {
				replace: {
					SERVER: './server/index.js',
					MANIFEST: './manifest.js',
					ENV_PREFIX: JSON.stringify(envPrefix)
				}
			});

			if (precompress) {
				builder.log.minor('Compressing assets');
				await builder.compress(`${out}/client`);
				await builder.compress(`${out}/prerendered`);
			}
		}
	};
}
