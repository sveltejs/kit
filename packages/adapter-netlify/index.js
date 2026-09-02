/** @import { TomlTable } from 'smol-toml' */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';
import process from 'node:process';
import { parse } from 'smol-toml';
import { build } from 'rolldown';
import { matches, get_publish_directory, s } from './utils.js';

/**
 * @typedef {{
 *   build?: { publish?: string }
 *   functions?: { node_bundler?: 'zisi' | 'esbuild' }
 * } & TomlTable} NetlifyConfig
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

/** @type {typeof import('./index.js').default} */
export default function ({ split = false, edge = edge_set_in_env_var } = {}) {
	return {
		name,
		async adapt(builder) {
			if (!builder.routes) {
				throw new Error(
					'@sveltejs/adapter-netlify >=2.x (possibly installed through @sveltejs/adapter-auto) requires @sveltejs/kit version 1.5 or higher. ' +
						'Either downgrade the adapter or upgrade @sveltejs/kit'
				);
			}

			if (existsSync(`${builder.config.files.assets}/_headers`)) {
				throw new Error(
					`The _headers file should be placed in the project root rather than the ${builder.config.files.assets} directory`
				);
			}

			if (existsSync(`${builder.config.files.assets}/_redirects`)) {
				throw new Error(
					`The _redirects file should be placed in the project root rather than the ${builder.config.files.assets} directory`
				);
			}

			const netlify_config = get_netlify_config();

			// "build" is the default publish directory when Netlify detects SvelteKit
			const publish = get_publish_directory(netlify_config, builder) || 'build';

			// empty out existing build directories
			rmSync(publish, { force: true, recursive: true });
			rmSync('.netlify/v1', { force: true, recursive: true });

			// clean up legacy directories from older adapter versions to avoid
			// gnarly edge cases when an existing project is upgraded to this version
			rmSync('.netlify/edge-functions', { force: true, recursive: true });
			rmSync('.netlify/server', { force: true, recursive: true });
			rmSync('.netlify/package.json', { force: true, recursive: true });
			rmSync('.netlify/serverless.js', { force: true, recursive: true });
			if (existsSync('.netlify/functions-internal')) {
				for (const file of readdirSync('.netlify/functions-internal')) {
					if (file.startsWith(FUNCTION_PREFIX)) {
						rmSync(join('.netlify/functions-internal', file), { force: true, recursive: true });
					}
				}
			}

			builder.log.minor(`Publishing to "${publish}"`);

			builder.log.minor('Copying assets...');
			const publish_dir = `${publish}${builder.config.paths.base}`;
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
				generate_serverless_functions({ builder, split, publish });
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
function generate_serverless_functions({ builder, publish, split }) {
	// https://docs.netlify.com/build/frameworks/frameworks-api/#netlifyv1functions
	mkdirSync(netlify_framework_serverless_path, { recursive: true });

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

			/** @type {string[][]} */
			let paths = [[]];

			// The parts should conform to URLPattern syntax
			// https://docs.netlify.com/build/functions/get-started/?fn-language=ts&data-tab=TypeScript#route-requests
			for (const [i, segment] of route.segments.entries()) {
				const param = `:param${i}`;

				if (/^\[\[.+\]\]$/.test(segment.content)) {
					paths = paths.flatMap((parts) => [parts, [...parts, param]]);
				} else {
					const part = segment.rest ? '*' : segment.dynamic ? param : segment.content;
					paths.forEach((parts) => parts.push(part));
				}
			}

			const name_parts = paths.at(-1);
			const name =
				FUNCTION_PREFIX +
				(name_parts?.join('-').replace(/[:.]/g, '_').replace('*', '__rest') || 'index');

			// Netlify handles trailing slashes for us, so we don't need to include them in the patterns
			const patterns = paths
				.map((parts) => `/${parts.join('/')}`)
				.flatMap((pattern) => [pattern, `${pattern === '/' ? '' : pattern}/__data.json`])
				.filter((pattern) => !seen.has(pattern));

			// skip routes whose patterns were already folded into other functions
			if (patterns.length === 0) continue;

			patterns.forEach((pattern) => seen.add(pattern));

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
				name,
				type: 'split'
			});
		}

		generate_serverless_function({
			builder,
			routes: [],
			patterns: ['/*'],
			name: `${FUNCTION_PREFIX}catch-all`,
			type: 'catch-all',
			exclude: Array.from(seen)
		});
	} else {
		generate_serverless_function({
			builder,
			routes: undefined,
			patterns: ['/*'],
			name: `${FUNCTION_PREFIX}render`,
			type: 'singular'
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
		return parse(readFileSync('netlify.toml', 'utf-8'));
	} catch (err) {
		if (err instanceof Error) {
			throw new Error(`Failed to parse netlify.toml: ${err.message}`, { cause: err });
		}
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

	mkdirSync('.netlify/v1', { recursive: true });
	writeFileSync(netlify_framework_config_path, s(config));
}

/** @typedef {'singular' | 'split' | 'catch-all'} ServerlessFunctionType */

/**
 *
 * @param {{
 *   builder: import('@sveltejs/kit').Builder,
 *   routes: import('@sveltejs/kit').RouteDefinition[] | undefined,
 *   patterns: string[],
 *   name: string,
 *   type: ServerlessFunctionType,
 *   exclude?: string[]
 * }} opts
 */
function generate_serverless_function({ builder, routes, patterns, name, type, exclude }) {
	builder.generateServerInstance(`.netlify/v1/server-${name}.js`, {
		routes,
		serverDirectory: '.netlify/v1/server'
	});

	const fn = generate_serverless_function_module(name, type);
	const config = generate_config_export(name, patterns, exclude);

	if (builder.hasServerInstrumentationFile()) {
		writeFileSync(`${netlify_framework_serverless_path}/${name}.mjs`, fn);
		const initializer = builder.createInstrumentationInitializer({
			outputDirectory: netlify_framework_serverless_path,
			serverDirectory: '.netlify/v1/server'
		});
		builder.instrument({
			entrypoint: `${netlify_framework_serverless_path}/${name}.mjs`,
			instrumentation: '.netlify/v1/server/instrumentation.server.js',
			start: `.netlify/v1/server/${name}.start.mjs`,
			initializer,
			module: {
				generateText: generate_traced_module(config)
			}
		});
	} else {
		writeFileSync(`${netlify_framework_serverless_path}/${name}.mjs`, `${fn}\n${config}`);
	}
}

/**
 * @param {string} name
 * @param {ServerlessFunctionType} type
 * @returns {string}
 */
function generate_serverless_function_module(name, type) {
	if (type === 'catch-all') {
		// Netlify encodes the response body but `fetch` automatically decodes it.
		// So, we need to remove the `content-encoding` header to allow Netlify
		// to correctly re-encode it on the way out.
		return `\
import { applyReroute } from '@sveltejs/kit/adapter';
import { init } from '../serverless.js';
import { server } from '../server-${name}.js';

const original_url_header = \`x-sveltekit-original-url-\${process.env.NETLIFY_FUNCTIONS_TOKEN}\`

const respond = init(server);

export default async (request, context) => {
	const catch_all_response = await respond(request, context);

	return await applyReroute(catch_all_response, async (url) => {
		const rerouted_request = new Request(url, request);
		rerouted_request.headers.set(original_url_header, request.url);

		const rerouted_response = await fetch(rerouted_request);

		const response = new Response(rerouted_response.body, rerouted_response);
		if (response.headers.has('content-encoding')) {
			response.headers.delete('content-encoding');
			response.headers.delete('content-length');
		}

		return response;
	});
};
`;
	}

	if (type === 'split') {
		return `\
import { init } from '../serverless.js';
import { server } from '../server-${name}.js';

const original_url_header = \`x-sveltekit-original-url-\${process.env.NETLIFY_FUNCTIONS_TOKEN}\`

const respond = init(server);

export default async (request, context) => {
	if (request.headers.has(original_url_header)) {
		const original_url = request.headers.get(original_url_header);
		request = new Request(original_url, request);
		request.headers.delete(original_url_header);
	}

	return await respond(request, context);
};
`;
	}

	return `\
import { init } from '../serverless.js';
import { server } from '../server-${name}.js';

export default init(server);
`;
}

const generator_string = `@sveltejs/adapter-netlify@${adapter_version}`;

/**
 * @param {string} name The name that shows up in the logs & metrics functions list
 * @param {string[]} patterns
 * @param {string[]} [exclude]
 * @returns {string}
 */
function generate_config_export(name, patterns, exclude = []) {
	// TODO: add a human friendly name for the function https://docs.netlify.com/build/frameworks/frameworks-api/#configuration-options-2

	// https://docs.netlify.com/build/frameworks/frameworks-api/#configuration-options-2
	return `\
export const config = {
	name: ${JSON.stringify(name)},
	generator: '${generator_string}',
	path: [${patterns.map(s).join(', ')}],
	excludedPath: [${['/.netlify/*', ...exclude].map(s).join(', ')}],
	preferStatic: true
};
`;
}

/**
 * @param {string} config
 * @returns {(opts: { instrumentation: string; start: string; initializer: string }) => string}
 */
function generate_traced_module(config) {
	return ({ instrumentation, start, initializer }) => {
		return `\
import ${JSON.stringify(to_import_specifier(initializer))};
import ${JSON.stringify(to_import_specifier(instrumentation))};
const { default: _0 } = await import(${JSON.stringify(to_import_specifier(start))});
export { _0 as default };

${config}`;
	};
}

/** @param {string} path */
function to_import_specifier(path) {
	return path.startsWith('.') ? path : `./${path}`;
}

/** @satisfies {import('rolldown').BuildOptions} */
const rolldown_config = {
	platform: 'browser',
	output: {
		sourcemap: true,
		codeSplitting: false
	},
	transform: {
		target: 'es2022'
	},
	// Node built-ins are allowed, but must be prefixed with `node:`
	// https://docs.netlify.com/edge-functions/api/#runtime-environment
	external: builtinModules.map((id) => `node:${id}`),
	resolve: {
		alias: Object.fromEntries(builtinModules.map((id) => [id, `node:${id}`]))
	}
};

/**
 * @param { object } params
 * @param {import('@sveltejs/kit').Builder} params.builder
 */
async function generate_edge_functions({ builder }) {
	const tmp = builder.getBuildDirectory('netlify-tmp');
	rmSync(tmp, { force: true, recursive: true });
	mkdirSync(tmp, { recursive: true });

	// https://docs.netlify.com/build/frameworks/frameworks-api/#edge-functions
	mkdirSync('.netlify/v1/edge-functions', { recursive: true });

	builder.log.minor('Generating Edge Function...');

	builder.copy(`${files}/edge.js`, `${tmp}/entry.js`, {
		replace: {
			'0SERVER': `./server.js`
		}
	});

	builder.generateServerInstance(`${tmp}/server.js`);

	const path = '/*';
	// We only need to specify paths without the trailing slash because
	// Netlify will handle the optional trailing slash for us
	const excluded_paths = [
		// Contains static files
		`/${builder.getAppPath()}/immutable/*`,
		`/${builder.getAppPath()}/version.json`,
		// the base root and `trailingSlash: 'always'` pages are recorded with a trailing slash
		...builder.prerendered.paths.map((path) => (path === '/' ? path : path.replace(/\/$/, ''))),
		...Array.from(builder.manifest.assets).flatMap(({ path: asset }) => {
			if (asset.endsWith('/index.html')) {
				const dir = asset.replace(/\/index\.html$/, '');
				return [`${builder.config.paths.base}/${asset}`, `${builder.config.paths.base}/${dir}`];
			}
			return `${builder.config.paths.base}/${asset}`;
		}),
		// Should not be served by SvelteKit at all
		'/.netlify/*'
	];

	if (builder.hasServerInstrumentationFile()) {
		const initializer = builder.createInstrumentationInitializer({
			outputDirectory: tmp,
			environment: 'export default Deno.env.toObject();\n'
		});
		writeFileSync(`${tmp}/instrumented-entry.js`, `export { default } from './entry.js';\n`);
		builder.instrument({
			entrypoint: `${tmp}/instrumented-entry.js`,
			instrumentation: `${builder.getServerDirectory()}/instrumentation.server.js`,
			initializer
		});
	}

	await build({
		...rolldown_config,
		input: builder.hasServerInstrumentationFile()
			? `${tmp}/instrumented-entry.js`
			: `${tmp}/entry.js`,
		output: {
			...rolldown_config.output,
			file: `${netlify_framework_edge_path}/${FUNCTION_PREFIX}render.js`
		}
	});

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
