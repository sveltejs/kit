import { join } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream';
import { promisify } from 'util';
import zlib from 'zlib';
import esbuild from 'esbuild';
import glob from 'tiny-glob';

const pipe = promisify(pipeline);

/**
 * @param {{precompress?: boolean} & import('esbuild').BuildOptions} options
 */
export default function ({
	outdir = 'build',
	outfile = join(outdir, 'index.js'),
	bundle = true,
	format = 'esm',
	platform = 'node',
	target = 'node12',
	external = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).dependencies || {}),
	...esbuildOptions
} = {}) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-node',

		async adapt({ utils, config }) {
			utils.log.minor('Copying assets');
			const static_directory = join(outdir, 'assets');
			utils.copy_client_files(static_directory);
			utils.copy_static_files(static_directory);

			if (precompress) {
				utils.log.minor('Compressing assets');
				await compress(static_directory);
			}

			utils.log.minor('Building server');
			const files = fileURLToPath(new URL('./files', import.meta.url));
			utils.copy(files, '.svelte-kit/node');
			await esbuild.build({
				...esbuildOptions,
				outdir,
				outfile,
				bundle,
				format,
				platform,
				target,
				external,
				entryPoints: ['.svelte-kit/node/index.js'],
				define: {
					...esbuildOptions.define,
					esbuild_app_dir: '"' + config.kit.appDir + '"'
				}
			});

			utils.log.minor('Prerendering static pages');
			await utils.prerender({
				dest: `${outdir}/prerendered`
			});
			if (precompress) {
				utils.log.minor('Compressing prerendered pages');
				await compress(`${out}/prerendered`);
			}
		}
	};

	return adapter;
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
			: zlib.createGzip({
					level: zlib.constants.Z_BEST_COMPRESSION
			  });

	const source = createReadStream(file);
	const destination = createWriteStream(`${file}.${format}`);

	await pipe(source, compress, destination);
}
