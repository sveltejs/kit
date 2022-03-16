import { createReadStream, createWriteStream, existsSync, statSync, writeFileSync } from 'fs';
import { pipeline } from 'stream';
import glob from 'tiny-glob';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import zlib from 'zlib';

const pipe = promisify(pipeline);

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('.')} */
export default function (opts = {}) {
	// TODO remove for 1.0
	// @ts-expect-error
	if (opts.env) {
		throw new Error(
			'options.env has been removed in favour of options.environment, which has different properties. Consult the adapter-node README: https://github.com/sveltejs/kit/tree/master/packages/adapter-node'
		);
	}

	const {
		out = 'build',
		precompress,
		environment: {
			SOCKET_PATH = 'SOCKET_PATH',
			HOST = 'HOST',
			PORT = 'PORT',
			ORIGIN = 'ORIGIN',
			XFF_DEPTH = 'XFF_DEPTH',
			ADDRESS_HEADER = 'ADDRESS_HEADER',
			PROTOCOL_HEADER = 'PROTOCOL_HEADER',
			HOST_HEADER = 'HOST_HEADER'
		} = {}
	} = opts;

	return {
		name: '@sveltejs/adapter-node',

		async adapt(builder) {
			builder.rimraf(out);

			builder.log.minor('Copying assets');
			builder.writeClient(`${out}/client`);
			builder.writeServer(`${out}/server`);
			builder.writeStatic(`${out}/static`);
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
					SOCKET_PATH: JSON.stringify(SOCKET_PATH),
					HOST: JSON.stringify(HOST),
					PORT: JSON.stringify(PORT),
					ORIGIN: JSON.stringify(ORIGIN),
					XFF_DEPTH: JSON.stringify(XFF_DEPTH),
					PROTOCOL_HEADER: JSON.stringify(PROTOCOL_HEADER),
					HOST_HEADER: JSON.stringify(HOST_HEADER),
					ADDRESS_HEADER: JSON.stringify(ADDRESS_HEADER)
				}
			});

			if (precompress) {
				builder.log.minor('Compressing assets');
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
	if (!existsSync(directory)) {
		return;
	}

	const files = await glob('**/*.{html,js,json,css,svg,xml,wasm}', {
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
