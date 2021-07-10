import esbuild from 'esbuild';
import {
	createReadStream,
	createWriteStream,
	existsSync,
	readFileSync,
	statSync,
	writeFileSync
} from 'fs';
import { join } from 'path';
import { pipeline } from 'stream';
import glob from 'tiny-glob';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import zlib from 'zlib';

const pipe = promisify(pipeline);

/**
 * @param {{
 *   out?: string;
 *   precompress?: boolean;
 *   env?: {
 *     host?: string;
 *     port?: string;
 *   };
 * }} options
 */
export default function ({
	out = 'build',
	precompress,
	env: { host: host_env = 'HOST', port: port_env = 'PORT' } = {}
} = {}) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-node',

		async adapt({ utils, config }) {
			utils.log.minor('Copying assets');
			const static_directory = join(out, 'assets');
			utils.copy_client_files(static_directory);
			utils.copy_static_files(static_directory);

			if (precompress) {
				utils.log.minor('Compressing assets');
				await compress(static_directory);
			}

			utils.log.minor('Building server');
			const files = fileURLToPath(new URL('./files', import.meta.url));
			utils.copy(files, '.svelte-kit/node');
			writeFileSync(
				'.svelte-kit/node/env.js',
				`export const host = process.env[${JSON.stringify(
					host_env
				)}] || '0.0.0.0';\nexport const port = process.env[${JSON.stringify(port_env)}] || 3000;`
			);
			await esbuild.build({
				entryPoints: ['.svelte-kit/node/index.js'],
				outfile: join(out, 'index.js'),
				bundle: true,
				external: Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).dependencies || {}),
				format: 'esm',
				platform: 'node',
				target: 'node12',
				inject: [join(files, 'shims.js')],
				define: {
					esbuild_app_dir: '"' + config.kit.appDir + '"'
				}
			});

			utils.log.minor('Prerendering static pages');
			await utils.prerender({
				dest: `${out}/prerendered`
			});
			if (precompress && existsSync(`${out}/prerendered`)) {
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
