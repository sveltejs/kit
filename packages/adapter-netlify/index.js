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

			utils.log.minor('Prerendering static pages...');
			await utils.prerender({
				dest: publish
			});

			// for esbuild, use ESM; for zip-it-and-ship-it, use CJS
			const esm = netlify_config?.functions?.node_bundler === 'esbuild';

			const entries = utils.createEntries((route) => {
				const parts = [];

				for (const segment of route.segments) {
					if (segment.rest) {
						parts.push('*');
						break; // Netlify redirects don't allow anything after a *
					} else if (segment.dynamic) {
						parts.push(`:${parts.length}`);
					} else {
						parts.push(segment.content);
					}
				}

				const pattern = `/${parts.join('/')}`;

				return {
					id: pattern,
					data: {
						name: parts.join('-').replace(/:/g, '_').replace('*', '__rest') || 'index'
					},
					filter: (other) => matches(route.segments, other.segments)
				};
			});

			entries.forEach((entry) => {
				const manifest = entry.generateManifest({ relativePath: '../server' });

				const fn = esm
					? `import { init } from '../handler.js';\n\nexport const handler = init(${manifest});\n`
					: `const { init } = require('../handler.js');\n\nexports.handler = init(${manifest});\n`;

				writeFileSync(`.netlify/functions-internal/${entry.data.name}.js`, fn);
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

			utils.log.minor('Copying assets...');
			utils.writeStatic(publish);
			utils.writeClient(publish);

			utils.log.minor('Writing redirects...');
			const redirect_file = join(publish, '_redirects');
			utils.copy('_redirects', redirect_file);
			const redirects = entries
				.map(({ id, data }) => `${id} /.netlify/functions/${data.name} 200`)
				.join('\n');
			appendFileSync(redirect_file, `\n\n${redirects}`);

			// TODO write a _headers file that makes client-side assets immutable
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

/**
 * @typedef {{ rest: boolean, dynamic: boolean, content: string }} RouteSegment
 */

/**
 * @param {RouteSegment[]} a
 * @param {RouteSegment[]} b
 * @returns {boolean}
 */
function matches(a, b) {
	if (a[0] && b[0]) {
		if (b[0].rest) {
			if (b.length === 1) return true;

			const next_b = b.slice(1);

			for (let i = 0; i < a.length; i += 1) {
				if (matches(a.slice(i), next_b)) return true;
			}

			return false;
		}

		if (!b[0].dynamic) {
			if (!a[0].dynamic && a[0].content !== b[0].content) return false;
		}

		if (a.length === 1 && b.length === 1) return true;
		return matches(a.slice(1), b.slice(1));
	} else if (a[0]) {
		return a.length === 1 && a[0].rest;
	} else {
		return b.length === 1 && b[0].rest;
	}
}
