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
export default function ({ split = false } = {}) {
	return {
		name: '@sveltejs/adapter-netlify',

		async adapt(builder) {
			const netlify_config = get_netlify_config();

			// "build" is the default publish directory when Netlify detects SvelteKit
			const publish = get_publish_directory(netlify_config, builder) || 'build';

			// empty out existing build directories
			builder.rimraf(publish);
			builder.rimraf('.netlify/functions-internal');
			builder.rimraf('.netlify/server');
			builder.rimraf('.netlify/package.json');
			builder.rimraf('.netlify/handler.js');

			builder.mkdirp('.netlify/functions-internal');

			builder.log.minor(`Publishing to "${publish}"`);

			builder.log.minor('Prerendering static pages...');
			await builder.prerender({
				dest: publish
			});

			builder.writeServer('.netlify/server');

			// for esbuild, use ESM
			// for zip-it-and-ship-it, use CJS until https://github.com/netlify/zip-it-and-ship-it/issues/750
			const esm = netlify_config?.functions?.node_bundler === 'esbuild';

			/** @type {string[]} */
			const redirects = [];

			const replace = {
				'0SERVER': './server/index.js' // digit prefix prevents CJS build from using this as a variable name, which would also get replaced
			};

			if (esm) {
				builder.copy(`${files}/esm`, '.netlify', { replace });
			} else {
				glob('**/*.js', { cwd: '.netlify/server' }).forEach((file) => {
					const filepath = `.netlify/server/${file}`;
					const input = readFileSync(filepath, 'utf8');
					const output = esbuild.transformSync(input, { format: 'cjs', target: 'node12' }).code;
					writeFileSync(filepath, output);
				});

				builder.copy(`${files}/cjs`, '.netlify', { replace });
				writeFileSync(join('.netlify', 'package.json'), JSON.stringify({ type: 'commonjs' }));
			}

			if (split) {
				builder.log.minor('Generating serverless functions...');

				builder.createEntries((route) => {
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
					const name = parts.join('-').replace(/[:.]/g, '_').replace('*', '__rest') || 'index';

					return {
						id: pattern,
						filter: (other) => matches(route.segments, other.segments),
						complete: (entry) => {
							const manifest = entry.generateManifest({
								relativePath: '../server',
								format: esm ? 'esm' : 'cjs'
							});

							const fn = esm
								? `import { init } from '../handler.js';\n\nexport const handler = init(${manifest});\n`
								: `const { init } = require('../handler.js');\n\nexports.handler = init(${manifest});\n`;

							writeFileSync(`.netlify/functions-internal/${name}.js`, fn);

							redirects.push(`${pattern} /.netlify/functions/${name} 200`);
						}
					};
				});
			} else {
				builder.log.minor('Generating serverless functions...');

				const manifest = builder.generateManifest({
					relativePath: '../server',
					format: esm ? 'esm' : 'cjs'
				});

				const fn = esm
					? `import { init } from '../handler.js';\n\nexport const handler = init(${manifest});\n`
					: `const { init } = require('../handler.js');\n\nexports.handler = init(${manifest});\n`;

				writeFileSync('.netlify/functions-internal/render.js', fn);

				redirects.push('* /.netlify/functions/render 200');
			}

			builder.log.minor('Copying assets...');
			builder.writeStatic(publish);
			builder.writeClient(publish);

			builder.log.minor('Writing redirects...');
			const redirect_file = join(publish, '_redirects');
			builder.copy('_redirects', redirect_file);
			appendFileSync(redirect_file, `\n\n${redirects.join('\n')}`);

			builder.log.minor('Writing custom headers...');
			const headers_file = join(publish, '_headers');
			builder.copy('_headers', headers_file);
			appendFileSync(
				headers_file,
				`\n\n/${builder.appDir}/*\n  cache-control: public\n  cache-control: immutable\n  cache-control: max-age=31536000\n`
			);
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
 * @param {import('@sveltejs/kit').Builder} builder
 **/
function get_publish_directory(netlify_config, builder) {
	if (netlify_config) {
		if (!netlify_config.build || !netlify_config.build.publish) {
			builder.log.warn('No publish directory specified in netlify.toml, using default');
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

	builder.log.warn(
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
