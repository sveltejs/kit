import { createReadStream, createWriteStream, statSync } from 'fs';
import { pipeline } from 'stream';
import glob from 'tiny-glob';
import { promisify } from 'util';
import zlib from 'zlib';

const pipe = promisify(pipeline);

/** @type {import('.')} */
export default function ({ pages = 'build', assets = pages, fallback, precompress = true } = {}) {
	return {
		name: '@sveltejs/adapter-static',

		async adapt({ utils }) {
			utils.rimraf(assets);
			utils.rimraf(pages);

			utils.copy_static_files(assets);
			utils.copy_client_files(assets);

			await utils.prerender({
				fallback,
				all: !fallback,
				dest: pages
			});

			if (precompress) {
				if (pages === assets) {
					utils.log.minor('Compressing assets and pages');
					await compress(assets);
				} else {
					utils.log.minor('Compressing assets');
					await compress(assets);

					utils.log.minor('Compressing pages');
					await compress(pages);
				}
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
