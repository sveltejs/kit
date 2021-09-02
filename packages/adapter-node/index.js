import fs from 'fs';
import { join } from 'path';
import { pipeline } from 'stream';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

import { appResolver } from '@sveltejs/kit/adapter';
import esbuild from 'esbuild';
import glob from 'tiny-glob';
import zlib from 'zlib';

const pipe = promisify(pipeline);

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/** @type {import('.')} */
export default function ({
	out = 'build',
	precompress,
	env: { path: path_env = 'SOCKET_PATH', host: host_env = 'HOST', port: port_env = 'PORT' } = {},
	esbuild: esbuild_config
} = {}) {
	return {
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

			utils.log.minor('Building SvelteKit middleware');
			const files = fileURLToPath(new URL('./files', import.meta.url));
			utils.copy(files, '.svelte-kit/node');
			fs.writeFileSync(
				'.svelte-kit/node/env.js', // types pointed in src/env.d.ts
				`export const path = process.env[${JSON.stringify(
					path_env
				)}] || false;\nexport const host = process.env[${JSON.stringify(
					host_env
				)}] || '0.0.0.0';\nexport const port = process.env[${JSON.stringify(
					port_env
				)}] || (!path && 3000);`
			);

			/** @type {BuildOptions} */
			const default_options = {
				entryPoints: ['.svelte-kit/node/middlewares.js'],
				outfile: join(out, 'middlewares.js'),
				bundle: true,
				external: Object.keys(
					JSON.parse(fs.readFileSync('package.json', 'utf8')).dependencies || {}
				),
				format: 'esm',
				platform: 'node',
				target: 'node12',
				inject: [join(files, 'shims.js')],
				plugins: [appResolver()],
				define: {
					APP_DIR: `"/${config.kit.appDir}/"`
				}
			};
			await esbuild.build(esbuild_config ? await esbuild_config(default_options) : default_options);

			utils.log.minor('Building SvelteKit reference server');
			/** @type {BuildOptions} */
			const ref_server_options = {
				entryPoints: ['.svelte-kit/node/index.js'],
				outfile: join(out, 'index.js'),
				bundle: true,
				external: ['./middlewares.js'], // does not work, eslint does not exclude middlewares from target
				format: 'esm',
				platform: 'node',
				target: 'node12',
				// external exclude workaround, see https://github.com/evanw/esbuild/issues/514
				plugins: [
					{
						name: 'fix-middlewares-exclude',
						setup(build) {
							// Match an import called "./middlewares.js" and mark it as external
							build.onResolve({ filter: /^\.\/middlewares\.js$/ }, () => ({ external: true }));
						}
					}
				]
			};
			await esbuild.build(
				esbuild_config ? await esbuild_config(ref_server_options) : ref_server_options
			);

			utils.log.minor('Prerendering static pages');
			await utils.prerender({
				dest: `${out}/prerendered`
			});
			if (precompress && fs.existsSync(`${out}/prerendered`)) {
				utils.log.minor('Compressing prerendered pages');
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
						[zlib.constants.BROTLI_PARAM_SIZE_HINT]: fs.statSync(file).size
					}
			  })
			: zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

	const source = fs.createReadStream(file);
	const destination = fs.createWriteStream(`${file}.${format}`);

	await pipe(source, compress, destination);
}
