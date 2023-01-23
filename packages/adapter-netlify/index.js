import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve, posix } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';
import toml from '@iarna/toml';

/**
 * @typedef {{
 *   build?: { publish?: string }
 *   functions?: { node_bundler?: 'zisi' | 'esbuild' }
 * } & toml.JsonMap} NetlifyConfig
 */

/**
 * @typedef {{
 *	 functions: Array<
 *		 | {
 *				 function: string;
 *				 path: string;
 *		   }
 *		 | {
 *				 function: string;
 *				 pattern: string;
 *		   }
 *	 >;
 *	 version: 1;
 *	 }} HandlerManifest
 */

const files = fileURLToPath(new URL('./files', import.meta.url).href);

const edge_set_in_env_var =
	process.env.NETLIFY_SVELTEKIT_USE_EDGE === 'true' ||
	process.env.NETLIFY_SVELTEKIT_USE_EDGE === '1';

/** @type {import('.').default} */
export default function ({ split = false, edge = edge_set_in_env_var } = {}) {
	return {
		name: '@sveltejs/adapter-netlify',

		async adapt(builder) {
			const netlify_config = get_netlify_config();

			// "build" is the default publish directory when Netlify detects SvelteKit
			const publish = get_publish_directory(netlify_config, builder) || 'build';

			// empty out existing build directories
			builder.rimraf(publish);
			builder.rimraf('.netlify/edge-functions');
			builder.rimraf('.netlify/functions-internal');
			builder.rimraf('.netlify/server');
			builder.rimraf('.netlify/package.json');
			builder.rimraf('.netlify/serverless.js');

			builder.log.minor(`Publishing to "${publish}"`);

			builder.log.minor('Copying assets...');
			const publish_dir = `${publish}${builder.config.kit.paths.base}`;
			builder.writeClient(publish_dir);
			builder.writePrerendered(publish_dir);

			builder.log.minor('Writing custom headers...');
			const headers_file = join(publish, '_headers');
			builder.copy('_headers', headers_file);
			appendFileSync(
				headers_file,
				`\n\n/${builder.getAppPath()}/immutable/*\n  cache-control: public\n  cache-control: immutable\n  cache-control: max-age=31536000\n`
			);

			if (edge) {
				if (split) {
					throw new Error('Cannot use `split: true` alongside `edge: true`');
				}

				await generate_edge_functions({ builder });
			} else {
				await generate_lambda_functions({ builder, split, publish });
			}
		}
	};
}
/**
 * @param { object } params
 * @param {import('@sveltejs/kit').Builder} params.builder
 */
async function generate_edge_functions({ builder }) {
	const tmp = builder.getBuildDirectory('netlify-tmp');
	builder.rimraf(tmp);
	builder.mkdirp(tmp);

	builder.mkdirp('.netlify/edge-functions');

	// Don't match the static directory
	const pattern = '^/.*$';

	// Go doesn't support lookarounds, so we can't do this
	// const pattern = appDir ? `^/(?!${escapeStringRegexp(appDir)}).*$` : '^/.*$';

	/** @type {HandlerManifest} */
	const edge_manifest = {
		functions: [
			{
				function: 'render',
				pattern
			}
		],
		version: 1
	};

	builder.log.minor('Generating Edge Function...');
	const relativePath = posix.relative(tmp, builder.getServerDirectory());

	builder.copy(`${files}/edge.js`, `${tmp}/entry.js`, {
		replace: {
			'0SERVER': `${relativePath}/index.js`,
			MANIFEST: './manifest.js'
		}
	});

	const manifest = builder.generateManifest({
		relativePath
	});

	writeFileSync(
		`${tmp}/manifest.js`,
		`export const manifest = ${manifest};\n\nexport const prerendered = new Set(${JSON.stringify(
			builder.prerendered.paths
		)});\n`
	);

	await esbuild.build({
		entryPoints: [`${tmp}/entry.js`],
		outfile: '.netlify/edge-functions/render.js',
		bundle: true,
		format: 'esm',
		platform: 'browser',
		sourcemap: 'linked',
		target: 'es2020'
	});

	writeFileSync('.netlify/edge-functions/manifest.json', JSON.stringify(edge_manifest));
}
/**
 * @param { object } params
 * @param {import('@sveltejs/kit').Builder} params.builder
 * @param { string } params.publish
 * @param { boolean } params.split
 */
async function generate_lambda_functions({ builder, publish, split }) {
	builder.mkdirp('.netlify/functions-internal');

	/** @type {string[]} */
	const redirects = [];
	builder.writeServer('.netlify/server');

	const replace = {
		'0SERVER': './server/index.js' // digit prefix prevents CJS build from using this as a variable name, which would also get replaced
	};

	builder.copy(`${files}/esm`, '.netlify', { replace });

	// Configuring the function to use ESM as the output format.
	const fn_config = JSON.stringify({ config: { nodeModuleFormat: 'esm' }, version: 1 });

	if (split) {
		builder.log.minor('Generating serverless functions...');

		await builder.createEntries((route) => {
			const parts = [];
			// Netlify's syntax uses '*' and ':param' as "splats" and "placeholders"
			// https://docs.netlify.com/routing/redirects/redirect-options/#splats
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
						relativePath: '../server'
					});

					const fn = `import { init } from '../serverless.js';\n\nexport const handler = init(${manifest});\n`;

					writeFileSync(`.netlify/functions-internal/${name}.mjs`, fn);
					writeFileSync(`.netlify/functions-internal/${name}.json`, fn_config);

					redirects.push(`${pattern} /.netlify/functions/${name} 200`);
					redirects.push(`${pattern}/__data.json /.netlify/functions/${name} 200`);
				}
			};
		});
	} else {
		builder.log.minor('Generating serverless functions...');

		const manifest = builder.generateManifest({
			relativePath: '../server'
		});

		const fn = `import { init } from '../serverless.js';\n\nexport const handler = init(${manifest});\n`;

		writeFileSync(`.netlify/functions-internal/render.json`, fn_config);
		writeFileSync('.netlify/functions-internal/render.mjs', fn);
		redirects.push('* /.netlify/functions/render 200');
	}

	// this should happen at the end, after builder.writeClient(...),
	// so that generated redirects are appended to custom redirects
	// rather than replaced by them
	builder.log.minor('Writing redirects...');
	const redirect_file = join(publish, '_redirects');
	if (existsSync('_redirects')) {
		builder.copy('_redirects', redirect_file);
	}
	builder.mkdirp(dirname(redirect_file));
	appendFileSync(redirect_file, `\n\n${redirects.join('\n')}`);
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
		if (!netlify_config.build?.publish) {
			builder.log.minor('No publish directory specified in netlify.toml, using default');
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
		'No netlify.toml found. Using default publish directory. Consult https://kit.svelte.dev/docs/adapter-netlify#usage for more details'
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
