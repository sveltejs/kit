import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import toml from '@iarna/toml';

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/**
 * @param {{
 *   esbuild?: (defaultOptions: BuildOptions) => Promise<BuildOptions> | BuildOptions;
 * }} [options]
 **/
export default function (options) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-netlify',

		async adapt({ utils }) {
			const { publish, functions } = validate_config().build;

			utils.rimraf(publish);
			utils.rimraf(functions);

			const files = fileURLToPath(new URL('./files', import.meta.url));

			utils.log.minor('Generating serverless function...');
			utils.copy(join(files, 'entry.js'), '.svelte-kit/netlify/entry.js');

			/** @type {BuildOptions} */
			const defaultOptions = {
				entryPoints: ['.svelte-kit/netlify/entry.js'],
				outfile: join(functions, 'render/index.js'),
				bundle: true,
				inject: [join(files, 'shims.js')],
				platform: 'node'
			};

			const buildOptions =
				options && options.esbuild ? await options.esbuild(defaultOptions) : defaultOptions;

			await esbuild.build(buildOptions);

			writeFileSync(join(functions, 'package.json'), JSON.stringify({ type: 'commonjs' }));

			utils.log.info('Prerendering static pages...');
			await utils.prerender({
				dest: publish
			});

			utils.log.minor('Copying assets...');
			utils.copy_static_files(publish);
			utils.copy_client_files(publish);

			utils.log.minor('Writing redirects...');
			utils.copy('_redirects', `${publish}/_redirects`);
			appendFileSync(`${publish}/_redirects`, '\n\n/* /.netlify/functions/render 200');
		}
	};

	return adapter;
}

function validate_config() {
	if (existsSync('netlify.toml')) {
		let netlify_config;

		try {
			netlify_config = toml.parse(readFileSync('netlify.toml', 'utf-8'));
		} catch (err) {
			err.message = `Error parsing netlify.toml: ${err.message}`;
			throw err;
		}

		if (!netlify_config.build || !netlify_config.build.publish || !netlify_config.build.functions) {
			throw new Error(
				'You must specify build.publish and build.functions in netlify.toml. Consult https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify#configuration'
			);
		}

		if (netlify_config.redirects) {
			throw new Error(
				"Redirects are not supported in netlify.toml. Use _redirects instead. For more details consult the readme's troubleshooting section."
			);
		}

		return netlify_config;
	}

	// TODO offer to create one?
	throw new Error(
		'Missing a netlify.toml file. Consult https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify#configuration'
	);
}
