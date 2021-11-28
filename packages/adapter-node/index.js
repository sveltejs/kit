import { createReadStream, createWriteStream, statSync, writeFileSync } from 'fs';
import { pipeline } from 'stream';
import glob from 'tiny-glob';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import zlib from 'zlib';

const pipe = promisify(pipeline);

const files = fileURLToPath(new URL('./files', import.meta.url));

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/** @type {import('.')} */
export default function ({
	out = 'build',
	precompress,
	env: { path: path_env = 'SOCKET_PATH', host: host_env = 'HOST', port: port_env = 'PORT' } = {}
} = {}) {
	return {
		name: '@sveltejs/adapter-node',

		async adapt({ utils }) {
			utils.rimraf(out);

			utils.log.minor('Copying assets');
			utils.writeClient(`${out}/client`);
			utils.writeServer(`${out}/server`);
			utils.writeStatic(`${out}/static`);

			writeFileSync(
				`${out}/manifest.js`,
				`export const manifest = ${utils.generateManifest({
					relativePath: './server'
				})};\n`
			);

			utils.copy(files, out, {
				replace: {
					APP: './server/app.js', // TODO hard-coded path is brittle
					MANIFEST: './manifest.js',
					PATH_ENV: JSON.stringify(path_env),
					HOST_ENV: JSON.stringify(host_env),
					PORT_ENV: JSON.stringify(port_env)
				}
			});

			utils.log.minor('Prerendering static pages');
			await utils.prerender({
				dest: `${out}/prerendered`
			});

			if (precompress) {
				utils.log.minor('Compressing assets');
				await compress(`${out}/client`);
				await compress(`${out}/static`);
				await compress(`${out}/prerendered`);
			}
		}
	};
}

/**
 * @param {string} directory
 */
async function compress(directory) {
	const files = await glob('**/*.{html,js,json,css,svg,xml}', {
		cwd: directory,
		dot: true,
		absolute: true,
		filesOnly: true
	});

	await Promise.all(
		files.map((file) => Promise.all([compress_file(file, 'gz'), compress_file(file, 'br')]))
	);
}

/**
 * @param {string} file
 * @param {'gz' | 'br'} format
 */
async function compress_file(file, format = 'gz') {
	const compress =
		format == 'br'
			? zlib.createBrotliCompress({
					params: {
						[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
						[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
						[zlib.constants.BROTLI_PARAM_SIZE_HINT]: statSync(file).size
					}
			  })
			: zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

	const source = createReadStream(file);
	const destination = createWriteStream(`${file}.${format}`);

	await pipe(source, compress, destination);
}
