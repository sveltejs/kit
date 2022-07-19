import { createReadStream, createWriteStream, statSync } from 'fs';
import { pipeline } from 'stream';
import glob from 'tiny-glob';
import { promisify } from 'util';
import zlib from 'zlib';
import { platforms } from './platforms.js';

const pipe = promisify(pipeline);

/** @type {import('.').default} */
export default function (options) {
	return {
		name: '@sveltejs/adapter-static',

		async adapt(builder) {
			if (!options?.fallback && !builder.config.kit.prerender.default) {
				throw Error(
					'adapter-static requires `config.kit.prerender.default` to be `true` unless you set the `fallback: true` option to create a single-page app. See https://github.com/sveltejs/kit/tree/master/packages/adapter-static#spa-mode for more information'
				);
			}

			const platform = platforms.find((platform) => platform.test());

			if (platform) {
				if (options) {
					builder.log.warn(
						`Detected ${platform.name}. Please remove adapter-static options to enable zero-config mode`
					);
				} else {
					builder.log.info(`Detected ${platform.name}, using zero-config mode`);
				}
			}

			const {
				pages = 'build',
				assets = pages,
				fallback,
				precompress
			} = options ??
			platform?.defaults(builder.config) ??
			/** @type {import('./index').AdapterOptions} */ ({});

			builder.rimraf(assets);
			builder.rimraf(pages);

			builder.writeClient(assets);
			builder.writePrerendered(pages, { fallback });

			if (precompress) {
				if (pages === assets) {
					builder.log.minor('Compressing assets and pages');
					await compress(assets);
				} else {
					builder.log.minor('Compressing assets');
					await compress(assets);

					builder.log.minor('Compressing pages');
					await compress(pages);
				}
			}

			if (pages === assets) {
				builder.log(`Wrote site to "${pages}"`);
			} else {
				builder.log(`Wrote pages to "${pages}" and assets to "${assets}"`);
			}

			if (!options) platform?.done(builder);
		}
	};
}

/**
 * @param {string} directory
 */
async function compress(directory) {
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
