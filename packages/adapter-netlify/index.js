import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import toml from '@iarna/toml';

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/** @type {import('.')} */
export default function (options) {
	return {
		name: '@sveltejs/adapter-netlify',

		async adapt({ utils }) {
			// "build" is the default publish directory when Netlify detects SvelteKit
			const publish = get_publish_directory(utils) || 'build';

			utils.log.minor(`Publishing to "${publish}"`);

			utils.rimraf(publish);

			const files = fileURLToPath(new URL('./files', import.meta.url));

			utils.log.minor('Generating serverless function...');
			utils.copy(join(files, 'entry.js'), '.svelte-kit/netlify/entry.js');

			/** @type {BuildOptions} */
			const default_options = {
				entryPoints: ['.svelte-kit/netlify/entry.js'],
				// Any functions in ".netlify/functions-internal" are bundled in addition to user-defined Netlify functions.
				// See https://github.com/netlify/build/pull/3213 for more details
				outfile: '.netlify/functions-internal/__render.js',
				bundle: true,
				inject: [join(files, 'shims.js')],
				platform: 'node'
			};

			const build_options =
				options && options.esbuild ? await options.esbuild(default_options) : default_options;

			await esbuild.build(build_options);

			writeFileSync(join('.netlify', 'package.json'), JSON.stringify({ type: 'commonjs' }));

			utils.log.minor('Prerendering static pages...');
			await utils.prerender({
				dest: publish
			});

			utils.log.minor('Copying assets...');
			utils.copy_static_files(publish);
			utils.copy_client_files(publish);

			utils.log.minor('Writing redirects...');

			const redirectPath = join(publish, '_redirects');
			utils.copy('_redirects', redirectPath);
			appendFileSync(redirectPath, '\n\n/* /.netlify/functions/__render 200');
		}
	};
}
/**
 * @param {import('@sveltejs/kit').AdapterUtils} utils
 **/
function get_publish_directory(utils) {
	if (existsSync('netlify.toml')) {
		/** @type {{ build?: { publish?: string }} & toml.JsonMap } */
		let netlify_config;

		try {
			netlify_config = toml.parse(readFileSync('netlify.toml', 'utf-8'));
		} catch (err) {
			err.message = `Error parsing netlify.toml: ${err.message}`;
			throw err;
		}

		if (!netlify_config.build || !netlify_config.build.publish) {
			utils.log.warn('No publish directory specified in netlify.toml, using default');
			return;
		}

		if (netlify_config.redirects) {
			throw new Error(
				"Redirects are not supported in netlify.toml. Use _redirects instead. For more details consult the readme's troubleshooting section."
			);
		}
		if (resolve(netlify_config.build.publish) === process.cwd()) {
			throw new Error(
				'The publish directory cannot be set to the site root. Please change it to another value such as "build" in netlify.toml.'
			);
		}
		return netlify_config.build.publish;
	}

	utils.log.warn(
		'No netlify.toml found. Using default publish directory. Consult https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify#configuration for more details '
	);
}
