/** @import { IntegrationsConfig } from '@netlify/edge-functions' */
/** @import { Builder, RouteDefinition } from '@sveltejs/kit' */
/** @import { TomlTable } from 'smol-toml' */
import crypto from 'node:crypto';
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

			// Copy user's _headers file if it exists
			if (existsSync('_headers')) {
				builder.log.minor('Copying user custom headers...');
				builder.copy('_headers', join(publish, '_headers'));
			}

			// Copy user's _redirects file if it exists
			if (existsSync('_redirects')) {
				builder.log.minor('Copying user redirects...');
				builder.copy('_redirects', join(publish, '_redirects'));
			}

			builder.log.minor('Writing Netlify config...');
			write_frameworks_config({ builder });

			if (edge) {
				if (split) {
					throw new Error('Cannot use `split: true` alongside `edge: true`');
				}

				await generate_edge_functions({ builder });
			} else {
				generate_serverless_functions(builder, split);
			}
		},

		supports: {
			read: () => true,
			instrumentation: () => true
		}
	};
}

/**
 * @param {Builder} builder
 * @param {boolean} split
 */
function generate_serverless_functions(builder, split) {
	// https://docs.netlify.com/build/frameworks/frameworks-api/#netlifyv1functions
	mkdirSync(netlify_framework_serverless_path, { recursive: true });

	builder.writeServer('.netlify/v1/server');

	builder.copy(`${files}/serverless.js`, '.netlify/v1/serverless.js');

	builder.log.minor('Generating serverless functions...');

	if (split) {
		const seen = new Set();
		let index = 0;
		const uuid = crypto.randomUUID();

		for (let i = 0; i < builder.routes.length; i++) {
			const route = builder.routes[i];
			if (route.prerender === true) continue;

			const routes = [route];

			/** @type {string[]} */
			const parts = [];

			// The parts should conform to URLPattern syntax
			// https://docs.netlify.com/build/functions/get-started/?fn-language=ts&data-tab=TypeScript#route-requests
			for (const [i, segment] of route.segments.entries()) {
				if (segment.rest) {
					parts.push('*');
				} else if (segment.dynamic) {
					// URLPattern requires params to start with letters
					const optional = /^\[\[.+\]\]$/.test(segment.content) ? '?' : '';
					parts.push(`:param${i}${optional}`);
				} else {
					parts.push(segment.content);
				}
			}

			// Netlify handles trailing slashes for us, so we don't need to include them in the pattern
			const pattern = `/${parts.join('/')}`;

			// skip routes with identical patterns, they were already folded into another function
			if (seen.has(pattern)) continue;

			// the route itself is human readable via the `name` config export,
			// so the function file can just use an index
			const name = `${FUNCTION_PREFIX}${index++}`;

			const patterns = [pattern, `${pattern === '/' ? '' : pattern}/__data.json`];
			patterns.forEach((pattern) => seen.add(pattern));

			// figure out which lower priority routes should be considered fallbacks
			for (let j = i + 1; j < builder.routes.length; j += 1) {
				const other = builder.routes[j];
				if (other.prerender === true) continue;

				if (matches(route.segments, other.segments)) {
					routes.push(other);
				}
			}

			generate_serverless_function(
				builder,
				{
					type: 'split',
					routes,
					patterns,
					name,
					display_name: `SvelteKit ${route.id}`
				},
				uuid
			);
		}

		generate_serverless_function(
			builder,
			{
				type: 'catch-all',
				routes: [],
				patterns: ['/*'],
				name: `${FUNCTION_PREFIX}catch-all`,
				display_name: 'SvelteKit catch-all',
				exclude: Array.from(seen)
			},
			uuid
		);
	} else {
		generate_serverless_function(builder, {
			type: 'singular',
			routes: undefined,
			patterns: ['/*'],
			name: `${FUNCTION_PREFIX}render`,
			display_name: 'SvelteKit server'
		});
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

/** @typedef {'singular' | 'split' | 'catch-all'} EntrypointType */

/**
 * @typedef {object} EntrypointMetadata
 * @property {EntrypointType} type
 * @property {RouteDefinition[] | undefined} routes
 * @property {string[]} patterns
 * @property {string} name
 * @property {string} display_name
 * @property {string[]} [exclude]
 */

/**
 * @param {Builder} builder
 * @param {EntrypointMetadata} fn
 * @param {string} [uuid]
 */
function generate_serverless_function(builder, fn, uuid) {
	builder.generateServerInstance(`.netlify/v1/server-${fn.name}.js`, {
		routes: fn.routes,
		serverDirectory: '.netlify/v1/server'
	});

	const filename = `${netlify_framework_serverless_path}/${fn.name}.mjs`;
	const code = generate_function_module(
		fn.type,
		'../serverless.js',
		`../server-${fn.name}.js`,
		uuid
	);
	const config = create_config_export('serverless', fn);

	if (builder.hasServerInstrumentationFile()) {
		writeFileSync(filename, code);
		const initializer = builder.createInstrumentationInitializer({
			outputDirectory: netlify_framework_serverless_path,
			serverDirectory: '.netlify/v1/server'
		});
		builder.instrument({
			entrypoint: filename,
			instrumentation: '.netlify/v1/server/instrumentation.server.js',
			start: `.netlify/v1/server/${fn.name}.start.mjs`,
			initializer,
			module: {
				generateText: generate_traced_module(config)
			}
		});
	} else {
		writeFileSync(filename, `${code}\n${config}`);
	}
}

/**
 * @param {EntrypointType} type
 * @param {string} init
 * @param {string} server
 * @param {string} [uuid]
 * @returns {string}
 */
function generate_function_module(type, init, server, uuid) {
	const runtime_imports = [
		`import { init } from '${init}';`,
		`import { server } from '${server}';`
	].join('\n');
	const original_pathname_header = `const original_pathname_header = \`x-sveltekit-original-pathname-${uuid}\``;

	if (type === 'catch-all' && uuid) {
		// Netlify encodes the response body but `fetch` automatically decodes it.
		// So, we need to remove the `content-encoding` header to allow Netlify
		// to correctly re-encode it on the way out.
		return `\
import { applyReroute } from '@sveltejs/kit/adapter';
${runtime_imports}

${original_pathname_header}

const respond = init(server);

export default async (request, context) => {
	const catch_all_response = await respond(request, context);

	return await applyReroute(catch_all_response, async (url) => {
		const rerouted_request = new Request(url, request);
		rerouted_request.headers.set(original_pathname_header, new URL(request.url).pathname);

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

	if (type === 'split' && uuid) {
		return `\
${runtime_imports}

${original_pathname_header}

const respond = init(server);

export default async (request, context) => {
	if (request.headers.has(original_pathname_header)) {
		const url = new URL(request.url);
		url.pathname = request.headers.get(original_pathname_header);
		request = new Request(url, request);
		request.headers.delete(original_pathname_header);
	}

	return await respond(request, context);
};
`;
	}

	return `\
${runtime_imports}

export default init(server);
`;
}

const generator_string = `@sveltejs/adapter-netlify@${adapter_version}`;

/**
 * @param {'serverless' | 'edge'} runtime
 * @param {EntrypointMetadata} fn
 * @returns {string}
 */
function create_config_export(runtime, fn) {
	/** @type {IntegrationsConfig & { preferStatic?: boolean }} */
	const config = {
		name: fn.display_name,
		generator: generator_string,
		path: /** @type {`/${string}`[]} */ (fn.patterns),
		excludedPath: /** @type {`/${string}`[]} */ (['/.netlify/*', ...(fn.exclude ?? [])])
	};

	if (runtime === 'serverless') {
		config.preferStatic = true;
	}

	return `export const config = ${s(config)};\n`;
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

	builder.copy(`${files}/edge.js`, `${tmp}/edge.js`);
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
		})
	];

	/** @type {EntrypointMetadata} */
	const fn = {
		type: 'singular',
		routes: undefined,
		patterns: ['/*'],
		name: `${FUNCTION_PREFIX}render`,
		display_name: 'SvelteKit server',
		exclude: excluded_paths
	};
	builder.generateServerInstance(`${tmp}/server-${fn.name}.js`);

	const code = generate_function_module(fn.type, './edge.js', `./server-${fn.name}.js`);
	const config = create_config_export('edge', fn);
	writeFileSync(`${tmp}/entry.js`, `${code}\n${config}`);

	if (builder.hasServerInstrumentationFile()) {
		const initializer = builder.createInstrumentationInitializer({
			outputDirectory: tmp,
			environment: 'export default Deno.env.toObject();\n'
		});
		writeFileSync(
			`${tmp}/instrumented-entry.js`,
			`export { default, config } from './entry.js';\n`
		);
		builder.instrument({
			entrypoint: `${tmp}/instrumented-entry.js`,
			instrumentation: `${builder.getServerDirectory()}/instrumentation.server.js`,
			initializer,
			module: {
				generateText: generate_traced_module(config)
			}
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
}
