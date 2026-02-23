/** @import { BuildOptions } from 'esbuild' */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';
import process from 'node:process';
import esbuild from 'esbuild';
import toml from '@iarna/toml';
import { matches, get_publish_directory, s } from './utils.js';

/**
 * @typedef {{
 *   build?: { publish?: string }
 *   functions?: { node_bundler?: 'zisi' | 'esbuild' }
 * } & toml.JsonMap} NetlifyConfig
 */

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const adapter_version = pkg.version;

const name = '@sveltejs/adapter-netlify';
const files = fileURLToPath(new URL('./files', import.meta.url).href);

const edge_set_in_env_var =
	process.env.NETLIFY_SVELTEKIT_USE_EDGE === 'true' ||
	process.env.NETLIFY_SVELTEKIT_USE_EDGE === '1';

const netlify_framework_config_path = '.netlify/v1/config.json';
const netlify_framework_serverless_path = '.netlify/v1/functions';
const netlify_framework_edge_path = '.netlify/v1/edge-functions';

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
 * @param { string } params.publish
 * @param { boolean } params.split
 */
function generate_lambda_functions({ builder, publish, split }) {
	// https://docs.netlify.com/build/frameworks/frameworks-api/#netlifyv1functions
	builder.mkdirp(netlify_framework_serverless_path);

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

			/** @type {string[]} */
			const parts = [];

			// The parts should conform to URLPattern syntax
			// https://docs.netlify.com/build/functions/get-started/?fn-language=ts&data-tab=TypeScript#route-requests
			for (const segment of route.segments) {
				if (segment.rest) {
					parts.push('*');
				} else if (segment.dynamic) {
					// URLPattern requires params to start with letters
					parts.push(`:param${parts.length}`);
				} else {
					parts.push(segment.content);
				}
			}

			// Netlify handles trailing slashes for us, so we don't need to include them in the pattern
			const pattern = `/${parts.join('/')}`;
			const name =
				FUNCTION_PREFIX + (parts.join('-').replace(/[:.]/g, '_').replace('*', '__rest') || 'index');

			// skip routes with identical patterns, they were already folded into another function
			if (seen.has(pattern)) continue;

			const patterns = [pattern, `${pattern === '/' ? '' : pattern}/__data.json`];
			patterns.forEach((p) => seen.add(p));

			// figure out which lower priority routes should be considered fallbacks
			for (let j = i + 1; j < builder.routes.length; j += 1) {
				const other = builder.routes[j];
				if (other.prerender === true) continue;

				if (matches(route.segments, other.segments)) {
					routes.push(other);
				}
			}

			generate_serverless_function({
				builder,
				routes,
				patterns,
				name
			});
		}

		generate_serverless_function({
			builder,
			routes: [],
			patterns: ['/*'],
			name: `${FUNCTION_PREFIX}catch-all`,
			exclude: Array.from(seen)
		});
	} else {
		generate_serverless_function({
			builder,
			routes: undefined,
			patterns: ['/*'],
			name: `${FUNCTION_PREFIX}render`
		});
	}

	// Copy user's custom _redirects file if it exists
	if (existsSync('_redirects')) {
		builder.log.minor('Copying user redirects...');
		const redirects_file = join(publish, '_redirects');
		builder.copy('_redirects', redirects_file);
	}
}

/**
 * @returns {NetlifyConfig | null}
 */
function get_netlify_config() {
	if (!existsSync('netlify.toml')) return null;

	try {
		return toml.parse(readFileSync('netlify.toml', 'utf-8'));
	} catch (err) {
		throw new Error(`Failed to parse netlify.toml: ${err.message}`, { cause: err });
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
	writeFileSync(netlify_framework_config_path, s(config));
}

/**
 *
 * @param {{
 *   builder: import('@sveltejs/kit').Builder,
 *   routes: import('@sveltejs/kit').RouteDefinition[] | undefined,
 *   patterns: string[],
 *   name: string,
 *   exclude?: string[]
 * }} opts
 */
function generate_serverless_function({ builder, routes, patterns, name, exclude }) {
	const manifest = builder.generateManifest({
		relativePath: '../server',
		routes
	});

	const fn = generate_serverless_function_module(manifest);
	const config = generate_config_export(patterns, exclude);

	if (builder.hasServerInstrumentationFile()) {
		writeFileSync(`${netlify_framework_serverless_path}/${name}.mjs`, fn);
		builder.instrument({
			entrypoint: `${netlify_framework_serverless_path}/${name}.mjs`,
			instrumentation: '.netlify/v1/server/instrumentation.server.js',
			start: `.netlify/v1/server/${name}.start.mjs`,
			module: {
				generateText: generate_traced_module(config)
			}
		});
	} else {
		writeFileSync(`${netlify_framework_serverless_path}/${name}.mjs`, `${fn}\n${config}`);
	}
}

/**
 * @param {string} manifest
 * @returns {string}
 */
function generate_serverless_function_module(manifest) {
	return `\
import { init } from '../serverless.js';

export default init(${manifest});
`;
}

const generator_string = `@sveltejs/adapter-netlify@${adapter_version}`;

/**
 * @param {string[]} patterns
 * @param {string[]} [exclude]
 * @returns {string}
 */
function generate_config_export(patterns, exclude = []) {
	// TODO: add a human friendly name for the function https://docs.netlify.com/build/frameworks/frameworks-api/#configuration-options-2

	// https://docs.netlify.com/build/frameworks/frameworks-api/#configuration-options-2
	return `\
export const config = {
	name: 'SvelteKit server',
	generator: '${generator_string}',
	path: [${patterns.map(s).join(', ')}],
	excludedPath: [${['/.netlify/*', ...exclude].map(s).join(', ')}],
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
import '../server/${instrumentation}';
const { default: _0 } = await import('../server/${start}');
export { _0 as default };

${config}`;
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
			outfile: `${netlify_framework_edge_path}/${FUNCTION_PREFIX}render.js`,
			...esbuild_config
		}),
		builder.hasServerInstrumentationFile() &&
			esbuild.build({
				entryPoints: [
					`${builder.getServerDirectory()}/${FUNCTION_PREFIX}instrumentation.server.js`
				],
				outfile: `${netlify_framework_edge_path}/${FUNCTION_PREFIX}instrumentation.server.js`,
				...esbuild_config
			})
	]);

	if (builder.hasServerInstrumentationFile()) {
		builder.instrument({
			entrypoint: `${netlify_framework_edge_path}/${FUNCTION_PREFIX}render.js`,
			instrumentation: `${netlify_framework_edge_path}/${FUNCTION_PREFIX}instrumentation.server.js`,
			start: `${netlify_framework_edge_path}/${FUNCTION_PREFIX}start.js`
		});
	}

	add_edge_function_config({ builder, path, excluded_paths });
}

/**
 * Adds edge function configuration to the Frameworks API config file `config.json`
 * https://docs.netlify.com/build/frameworks/frameworks-api/#netlifyv1edge-functions
 * @param {{ builder: import('@sveltejs/kit').Builder, path: string, excluded_paths: string[] }} params
 */
function add_edge_function_config({ path, excluded_paths }) {
	const config = JSON.parse(readFileSync(netlify_framework_config_path, 'utf-8'));

	// https://docs.netlify.com/build/frameworks/frameworks-api/#configuration-options-1
	config.edge_functions = [
		{
			function: `${FUNCTION_PREFIX}render`,
			name: 'SvelteKit server',
			generator: generator_string,
			path,
			excludedPath: excluded_paths
		}
	];

	writeFileSync(netlify_framework_config_path, s(config));
}
