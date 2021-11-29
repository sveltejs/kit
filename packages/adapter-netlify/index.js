import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import glob from 'tiny-glob/sync.js';
import esbuild from 'esbuild';
import toml from '@iarna/toml';

/**
 * @typedef {{
 *   build?: { publish?: string }
 *   functions?: { node_bundler?: 'zisi' | 'esbuild' }
 * } & toml.JsonMap} NetlifyConfig
 */

const files = fileURLToPath(new URL('./files', import.meta.url));

/** @type {import('.')} */
export default function () {
	return {
		name: '@sveltejs/adapter-netlify',

		async adapt({ utils }) {
			const netlify_config = get_netlify_config();

			// "build" is the default publish directory when Netlify detects SvelteKit
			const publish = get_publish_directory(netlify_config, utils) || 'build';

			// empty out existing build directories
			utils.rimraf(publish);
			utils.rimraf('.netlify/functions-internal');
			utils.rimraf('.netlify/server');
			utils.rimraf('.netlify/package.json');
			utils.rimraf('.netlify/handler.js');

			utils.mkdirp('.netlify/functions-internal');

			utils.log.minor(`Publishing to "${publish}"`);

			utils.log.minor('Generating serverless function...');
			utils.writeServer('.netlify/server');

			// for esbuild, use ESM; for zip-it-and-ship-it, use CJS
			const esm = netlify_config?.functions?.node_bundler === 'esbuild';

			/** @type {string[]} */
			const redirects = [];

			const create_function = esm
				? (manifest) =>
						`import { init } from '../handler.js';\n\nexport const handler = init(${manifest});\n`
				: (manifest) =>
						`const { init } = require('../handler.js');\n\nexports.handler = init(${manifest});\n`;

			utils.routes.forEach((route) => {
				const fn = create_function(
					utils.generateManifest({
						relativePath: '../server',
						scope: route.segments
					})
				);

				const name =
					route.segments
						.map((segment) => (segment.spread ? '__' : segment.content))
						.join('-')
						.replace(/[[\].]/g, '_') || 'index';

				writeFileSync(`.netlify/functions-internal/${name}.js`, fn);

				const pattern = [];

				for (const segment of route.segments) {
					if (segment.spread) {
						pattern.push('*');
						break; // Netlify redirects don't allow anything after a *
					} else if (segment.dynamic) {
						pattern.push(`:${pattern.length}`);
					} else {
						pattern.push(segment.content);
					}
				}

				redirects.push(`/${pattern.join('/')} /.netlify/functions/${name} 200`);
			});

			if (esm) {
				utils.copy(join(files, 'esm/handler.js'), '.netlify/handler.js');
			} else {
				// TODO might be useful if you could specify CJS/ESM as an option to writeServer
				glob('**/*.js', { cwd: '.netlify/server' }).forEach((file) => {
					const filepath = `.netlify/server/${file}`;
					const input = readFileSync(filepath, 'utf8');
					const output = esbuild.transformSync(input, { format: 'cjs', target: 'node12' }).code;
					writeFileSync(filepath, output);
				});

				utils.copy(join(files, 'cjs/handler.js'), '.netlify/handler.js');
				writeFileSync(join('.netlify', 'package.json'), JSON.stringify({ type: 'commonjs' }));
			}

			utils.log.minor('Prerendering static pages...');
			await utils.prerender({
				dest: publish
			});

			utils.log.minor('Copying assets...');
			utils.writeStatic(publish);
			utils.writeClient(publish);

			utils.log.minor('Writing redirects...');
			const redirect_file = join(publish, '_redirects');
			utils.copy('_redirects', redirect_file);
			appendFileSync(redirect_file, `\n\n${redirects.join('\n')}`);
		}
	};
}

function get_netlify_config() {
	if (!existsSync('netlify.toml')) return null;

	try {
		return /** @type {NetlifyConfig} */ (toml.parse(readFileSync('netlify.toml', 'utf-8')));
	} catch (err) {
		err.message = `Error parsing netlify.toml: ${err.message}`;
		throw err;
	}
}

/**
 * @param {NetlifyConfig} netlify_config
 * @param {import('@sveltejs/kit').AdapterUtils} utils
 **/
function get_publish_directory(netlify_config, utils) {
	if (netlify_config) {
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
