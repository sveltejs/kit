/** @import { BuildOptions } from 'esbuild' */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';
import process from 'node:process';
import esbuild from 'esbuild';
import toml from '@iarna/toml';
import { matches, get_publish_directory } from './utils.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const adapter_version = pkg.version;

/**
 * @typedef {{
 *   build?: { publish?: string }
 *   functions?: { node_bundler?: 'zisi' | 'esbuild' }
 * } & toml.JsonMap} NetlifyConfig
 */

const name = '@sveltejs/adapter-netlify';
const files = fileURLToPath(new URL('./files', import.meta.url).href);

const edge_set_in_env_var =
	process.env.NETLIFY_SVELTEKIT_USE_EDGE === 'true' ||
	process.env.NETLIFY_SVELTEKIT_USE_EDGE === '1';

const FUNCTION_PREFIX = 'sveltekit-';

/** @type {import('./index.js').default} */
export default function ({ split = false, edge = edge_set_in_env_var } = {}) {
	return {
		name,
		/** @param {import('@sveltejs/kit').Builder} builder */
		async adapt(builder) {
			if (!builder.routes) {
				throw new Error(
					'@sveltejs/adapter-netlify >=2.x (possibly installed through @sveltejs/adapter-auto) requires @sveltejs/kit version 1.5 or higher. ' +
						'Either downgrade the adapter or upgrade @sveltejs/kit'
				);
			}

			if (existsSync(`${builder.config.kit.files.assets}/_headers`)) {
				throw new Error(
					`The _headers file should be placed in the project root rather than the ${builder.config.kit.files.assets} directory`
				);
			}

			if (existsSync(`${builder.config.kit.files.assets}/_redirects`)) {
				throw new Error(
					`The _redirects file should be placed in the project root rather than the ${builder.config.kit.files.assets} directory`
				);
			}

			const netlify_config = get_netlify_config();

			// "build" is the default publish directory when Netlify detects SvelteKit
			const publish = get_publish_directory(netlify_config, builder) || 'build';

			// empty out existing build directories
			builder.rimraf(publish);
			builder.rimraf('.netlify/v1');

			// clean up legacy directories from older adapter versions
			builder.rimraf('.netlify/edge-functions');
			builder.rimraf('.netlify/server');
			builder.rimraf('.netlify/package.json');
			builder.rimraf('.netlify/serverless.js');
			if (existsSync('.netlify/functions-internal')) {
				for (const file of readdirSync('.netlify/functions-internal')) {
					if (file.startsWith(FUNCTION_PREFIX)) {
						builder.rimraf(join('.netlify/functions-internal', file));
					}
				}
			}

			builder.log.minor(`Publishing to "${publish}"`);

			builder.log.minor('Copying assets...');
			const publish_dir = `${publish}${builder.config.kit.paths.base}`;
			builder.writeClient(publish_dir);
			builder.writePrerendered(publish_dir);

			// Copy user's custom _headers file if it exists
			if (existsSync('_headers')) {
				builder.copy('_headers', join(publish, '_headers'));
			}

			builder.log.minor('Writing Netlify config...');
			write_frameworks_config({ builder });

			if (edge) {
				if (split) {
					throw new Error('Cannot use `split: true` alongside `edge: true`');
				}

				await generate_edge_functions({ builder });
			} else {
				generate_lambda_functions({ builder, split, publish });
			}
		},

		supports: {
			read: () => true,
			instrumentation: () => true
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

	// https://docs.netlify.com/build/frameworks/frameworks-api/#edge-functions
	builder.mkdirp('.netlify/v1/edge-functions');

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

	writeFileSync(`${tmp}/manifest.js`, `export const manifest = ${manifest};\n`);

	/** @type {{ assets: Set<string> }} */
	// we have to prepend the file:// protocol because Windows doesn't support absolute path imports
	const { assets } = (await import(`file://${tmp}/manifest.js`)).manifest;

	const path = '/*';
	// We only need to specify paths without the trailing slash because
	// Netlify will handle the optional trailing slash for us
	const excluded_paths = [
		// Contains static files
		`/${builder.getAppPath()}/immutable/*`,
		`/${builder.getAppPath()}/version.json`,
		...builder.prerendered.paths,
		...Array.from(assets).flatMap((asset) => {
			if (asset.endsWith('/index.html')) {
				const dir = asset.replace(/\/index\.html$/, '');
				return [
					`${builder.config.kit.paths.base}/${asset}`,
					`${builder.config.kit.paths.base}/${dir}`
				];
			}
			return `${builder.config.kit.paths.base}/${asset}`;
		}),
		// Should not be served by SvelteKit at all
		'/.netlify/*'
	];

	/** @type {BuildOptions} */
	const esbuild_config = {
		bundle: true,
		format: 'esm',
		platform: 'browser',
		sourcemap: 'linked',
		target: 'es2020',
		loader: {
			'.wasm': 'copy',
			'.woff': 'copy',
			'.woff2': 'copy',
			'.ttf': 'copy',
			'.eot': 'copy',
			'.otf': 'copy'
		},
		// Node built-ins are allowed, but must be prefixed with `node:`
		// https://docs.netlify.com/edge-functions/api/#runtime-environment
		external: builtinModules.map((id) => `node:${id}`),
		alias: Object.fromEntries(builtinModules.map((id) => [id, `node:${id}`]))
	};
	await Promise.all([
		esbuild.build({
			entryPoints: [`${tmp}/entry.js`],
			outfile: '.netlify/v1/edge-functions/render.js',
			...esbuild_config
		}),
		builder.hasServerInstrumentationFile() &&
			esbuild.build({
				entryPoints: [`${builder.getServerDirectory()}/instrumentation.server.js`],
				outfile: '.netlify/v1/edge-functions/instrumentation.server.js',
				...esbuild_config
			})
	]);

	if (builder.hasServerInstrumentationFile()) {
		builder.instrument?.({
			entrypoint: '.netlify/v1/edge-functions/render.js',
			instrumentation: '.netlify/v1/edge-functions/instrumentation.server.js',
			start: '.netlify/v1/edge-functions/start.js'
		});
	}

	// https://docs.netlify.com/build/frameworks/frameworks-api/#edge-functions
	// Edge function config goes in config.json
	add_edge_function_config({ builder, path, excluded_paths });
}
/**
 * @param { object } params
 * @param {import('@sveltejs/kit').Builder} params.builder
 * @param { string } params.publish
 * @param { boolean } params.split
 */
function generate_lambda_functions({ builder, publish, split }) {
	// https://docs.netlify.com/build/frameworks/frameworks-api/#netlifyv1functions
	builder.mkdirp('.netlify/v1/functions');

	builder.writeServer('.netlify/v1/server');

	const replace = {
		'0SERVER': './server/index.js' // digit prefix prevents CJS build from using this as a variable name, which would also get replaced
	};

	builder.copy(files, '.netlify/v1', { replace, filter: (file) => !file.endsWith('edge.js') });

	builder.log.minor('Generating serverless functions...');

	if (split) {
		const seen = new Set();

		for (let i = 0; i < builder.routes.length; i++) {
			const route = builder.routes[i];
			if (route.prerender === true) continue;

			const routes = [route];

			const parts = [];
			// Netlify's syntax uses '*' and ':param' as "splats" and "placeholders"
			// https://docs.netlify.com/routing/redirects/redirect-options/#splats
			for (const segment of route.segments) {
				if (segment.rest) {
					parts.push('*');
					break; // Netlify redirects don't allow anything after a *
				} else if (segment.dynamic) {
					// URLPattern requires params to start with letters
					parts.push(`:param${parts.length}`);
				} else {
					parts.push(segment.content);
				}
			}

			const pattern = `/${parts.join('/')}`;
			const name =
				FUNCTION_PREFIX + (parts.join('-').replace(/[:.]/g, '_').replace('*', '__rest') || 'index');

			// skip routes with identical patterns, they were already folded into another function
			if (seen.has(pattern)) continue;
			seen.add(pattern);

			// figure out which lower priority routes should be considered fallbacks
			for (let j = i + 1; j < builder.routes.length; j += 1) {
				const other = builder.routes[j];
				if (other.prerender === true) continue;

				if (matches(route.segments, other.segments)) {
					routes.push(other);
				}
			}

			const manifest = builder.generateManifest({
				relativePath: '../server',
				routes
			});

			const fn = generate_serverless_function_module(manifest);
			const config = generate_config_export(pattern);

			if (builder.hasServerInstrumentationFile()) {
				writeFileSync(`.netlify/v1/functions/${name}.mjs`, fn);
				builder.instrument({
					entrypoint: `.netlify/v1/functions/${name}.mjs`,
					instrumentation: '.netlify/v1/server/instrumentation.server.js',
					start: `.netlify/v1/functions/${name}.start.mjs`,
					module: {
						generateText: generate_traced_module(config)
					}
				});
			} else {
				writeFileSync(`.netlify/v1/functions/${name}.mjs`, `${fn}\n${config}`);
			}
		}
	} else {
		const manifest = builder.generateManifest({
			relativePath: '../server'
		});

		const fn = generate_serverless_function_module(manifest);
		const config = generate_config_export('/*');

		if (builder.hasServerInstrumentationFile()) {
			writeFileSync(`.netlify/v1/functions/${FUNCTION_PREFIX}render.mjs`, fn);
			builder.instrument({
				entrypoint: `.netlify/v1/functions/${FUNCTION_PREFIX}render.mjs`,
				instrumentation: '.netlify/v1/server/instrumentation.server.js',
				start: `.netlify/v1/functions/${FUNCTION_PREFIX}render.start.mjs`,
				module: {
					generateText: generate_traced_module(config)
				}
			});
		} else {
			writeFileSync(`.netlify/v1/functions/${FUNCTION_PREFIX}render.mjs`, `${fn}\n${config}`);
		}
	}

	// Copy user's custom _redirects file if it exists
	if (existsSync('_redirects')) {
		builder.log.minor('Copying user redirects...');
		const redirects_file = join(publish, '_redirects');
		builder.copy('_redirects', redirects_file);
	}
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
 * Writes the Netlify Frameworks API config file
 * https://docs.netlify.com/build/frameworks/frameworks-api/
 * @param {{ builder: import('@sveltejs/kit').Builder }} params
 */
function write_frameworks_config({ builder }) {
	// https://docs.netlify.com/build/frameworks/frameworks-api/#headers
	/** @type {{ headers: Array<{ for: string, values: Record<string, string> }> }} */
	const config = {
		headers: [
			{
				for: `/${builder.getAppPath()}/immutable/*`,
				values: {
					'cache-control': 'public, immutable, max-age=31536000'
				}
			}
		]
	};

	builder.mkdirp('.netlify/v1');
	writeFileSync('.netlify/v1/config.json', JSON.stringify(config, null, '\t'));
}

/**
 * Adds edge function configuration to the Frameworks API config file
 * https://docs.netlify.com/build/frameworks/frameworks-api/#edge-functions
 * @param {{ builder: import('@sveltejs/kit').Builder, path: string, excluded_paths: string[] }} params
 */
function add_edge_function_config({ path, excluded_paths }) {
	const config_path = '.netlify/v1/config.json';
	const config = JSON.parse(readFileSync(config_path, 'utf-8'));

	// https://docs.netlify.com/build/frameworks/frameworks-api/#edge-functions
	config.edge_functions = [
		{
			function: 'render',
			name: 'SvelteKit',
			generator: get_generator_string(),
			path,
			excludedPath: excluded_paths
		}
	];

	writeFileSync(config_path, JSON.stringify(config, null, '\t'));
}

/**
 * Gets the generator string for Netlify function metadata
 * @returns {string}
 */
function get_generator_string() {
	return `@sveltejs/adapter-netlify@${adapter_version}`;
}

/**
 * https://docs.netlify.com/functions/get-started/?fn-language=ts#response
 * @param {string} manifest
 * @returns {string}
 */
function generate_serverless_function_module(manifest) {
	return `\
import { init } from '../serverless.js';

export default init(${manifest});
`;
}

/**
 * @param {string} pattern
 * @returns {string}
 */
function generate_config_export(pattern) {
	return `\
export const config = {
	name: "SvelteKit server",
	generator: "${get_generator_string()}",
	path: "${pattern}",
	excludedPath: "/.netlify/*",
	preferStatic: true
};
`;
}

/**
 * @param {string} config
 * @returns {(opts: { instrumentation: string; start: string }) => string}
 */
function generate_traced_module(config) {
	return ({ instrumentation, start }) => {
		return `\
import './${instrumentation}';
const { default: _0 } = await import('./${start}');
export { _0 as default };

${config}`;
	};
}
