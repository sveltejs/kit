/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { ResolvedConfig } from 'vite' */
/** @import { Builder, RouteDefinition } from '@sveltejs/kit' */
/** @import { EnvVarConfig } from '@sveltejs/kit/env' */
/** @import { RouteData, ValidatedConfig, BuildData, ServerMetadata, ServerMetadataRoute, Prerendered, PrerenderMap, Logger, RemoteChunk } from 'types' */
import { loadEnv } from 'vite';
import * as devalue from 'devalue';
import {
	createReadStream,
	createWriteStream,
	existsSync,
	mkdirSync,
	rmSync,
	statSync
} from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { copy, relative_path, walk } from '../../utils/filesystem.js';
import { posixify } from '../../utils/os.js';
import { generate_manifest } from '../generate_manifest/index.js';
import { get_route_segments } from '../../utils/routing.js';
import generate_fallback from '../postbuild/fallback.js';
import { dedent, write } from '../sync/utils.js';
import { find_server_assets } from '../generate_manifest/find_server_assets.js';
import { create_exported_declarations } from '../env.js';
import { handle_issues, validate } from '../../exports/internal/env.js';
import { get_mime_lookup } from '../utils.js';
import { lookup as mime_lookup } from '../../utils/mime.js';

const pipe = promisify(pipeline);
const extensions = [
	'.html',
	'.js',
	'.mjs',
	'.json',
	'.css',
	'.svg',
	'.xml',
	'.wasm',
	'.txt',
	'.md',
	'.mdx'
];

/**
 * Creates the Builder which is passed to adapters for building the application.
 * @param {{
 *   config: ValidatedConfig;
 *   build_data: BuildData;
 *   server_metadata: ServerMetadata;
 *   route_data: RouteData[];
 *   prerendered: Prerendered;
 *   prerender_map: PrerenderMap;
 *   app_manifest: typeof import('$app/manifest');
 *   log: Logger;
 *   vite_config: ResolvedConfig;
 *   remotes: RemoteChunk[];
 *   explicit_env_config: Record<string, EnvVarConfig<any>> | null;
 * }} opts
 * @returns {Builder}
 */
export function create_builder({
	config,
	build_data,
	server_metadata,
	route_data,
	prerendered,
	prerender_map,
	app_manifest,
	log,
	vite_config,
	remotes,
	explicit_env_config
}) {
	/** @type {Map<RouteDefinition, RouteData>} */
	const lookup = new Map();

	/**
	 * Rather than exposing the internal `RouteData` type, which is subject to change,
	 * we expose a stable type that adapters can use to group/filter routes
	 */
	const routes = route_data.map((route) => {
		const { config, methods, page, api } = /** @type {ServerMetadataRoute} */ (
			server_metadata.routes.get(route.id)
		);

		/** @type {RouteDefinition} */
		const facade = {
			id: route.id,
			api,
			page,
			segments: get_route_segments(route.id).map((segment) => ({
				dynamic: segment.includes('['),
				rest: segment.includes('[...'),
				content: segment
			})),
			pattern: route.pattern,
			prerender: prerender_map.get(route.id) ?? false,
			methods,
			config
		};

		lookup.set(facade, route);

		return facade;
	});

	// $app/manifest cannot include the service worker because it's used by the service worker itself,
	// but the adapter needs to know about it so we add it here.
	if (build_data.service_worker) {
		app_manifest.assets.push({ path: build_data.service_worker });
	}

	return {
		log,
		rimraf: (dir) => rmSync(dir, { force: true, recursive: true }),
		mkdirp: (dir) => mkdirSync(dir, { recursive: true }),
		copy,

		config,
		prerendered,
		routes,
		manifest: app_manifest,
		get mimeTypes() {
			// TODO - make the `generate_manifest` function return data instead of a string, and retrieve mime types from there
			const mime_types = get_mime_lookup(build_data.manifest_data);
			const server_assets = find_server_assets(
				build_data,
				route_data.filter((route) => prerender_map.get(route.id) !== true),
				vite_config.root
			);
			for (const file of server_assets) {
				const ext = path.extname(file);
				mime_types[ext] ??= mime_lookup(ext) || '';
			}

			// record extensions that only exist in prerendered output, e.g. a prerendered favicon.ico
			for (const pathname of prerendered.paths) {
				const ext = path.extname(pathname);
				if (ext) mime_types[ext] ??= mime_lookup(ext) || '';
			}
			return mime_types;
		},

		async compress(directory) {
			if (!existsSync(directory)) {
				return [];
			}

			const files = [...walk(directory)].filter((file) => extensions.includes(path.extname(file)));

			await Promise.all(
				files.flatMap((file) => {
					const abs = path.resolve(directory, file);
					return [compress_file(abs, 'gz'), compress_file(abs, 'br')];
				})
			);

			return files;
		},

		findServerAssets(route_data) {
			return find_server_assets(
				build_data,
				route_data.map((route) => /** @type {import('types').RouteData} */ (lookup.get(route))),
				vite_config.root
			);
		},

		async generateFallback(dest) {
			const manifest_path = `${config.outDir}/output/server/manifest-full.js`;
			const env = loadEnv(vite_config.mode, config.env.dir, '');

			const fallback = await generate_fallback({
				manifest_path,
				env,
				out_dir: config.outDir,
				origin: config.paths.origin || 'http://sveltekit-prerender',
				assets: config.files.assets
			});

			if (existsSync(dest)) {
				log.warn(
					`\nOverwriting ${dest} with fallback page. Consider using a different name for the fallback.\n`
				);
			}

			write(dest, fallback);
		},

		generateEnvModule() {
			if (!build_data.client?.uses_env_dynamic_public) return;

			const dest = `${config.outDir}/output/prerendered/dependencies/${config.appDir}`;
			const env = loadEnv(vite_config.mode, config.env.dir, '');

			/** @type {Record<string, any>} */
			const values = {};
			const variables = explicit_env_config ?? {};

			/** @type {Record<string, StandardSchemaV1.Issue[]>} */
			const issues = {};

			for (const [name, config] of Object.entries(variables)) {
				if (config.static || !config.public) continue;
				values[name] = validate(variables, env[name], name, issues);
			}

			handle_issues(issues);

			const payload = devalue.uneval(values);

			write(`${dest}/env.js`, `export const env=${payload}`);
		},

		generateManifest() {
			throw new Error(
				'The `generateManifest` adapter API has been removed — use `generateServerInstance` or `builder.manifest` instead. You may need to update your adapter'
			);
		},

		generateServerInstance(dest, { routes: subset, serverDirectory } = {}) {
			const relative = relative_path(
				path.dirname(dest),
				serverDirectory ?? this.getServerDirectory()
			);
			write(
				dest,
				dedent`
					import { create_server } from '${relative}/index.js';
					const manifest = ${generate_manifest({
						build_data,
						prerendered: prerendered.paths,
						relative_path: relative,
						routes: subset
							? subset.map((route) => /** @type {import('types').RouteData} */ (lookup.get(route)))
							: route_data.filter((route) => prerender_map.get(route.id) !== true),
						remotes,
						root: vite_config.root
					})};
					export const server = create_server(manifest);
				`
			);
		},

		getBuildDirectory(name) {
			return `${config.outDir}/${name}`;
		},

		getClientDirectory() {
			return `${config.outDir}/output/client`;
		},

		getServerDirectory() {
			return `${config.outDir}/output/server`;
		},

		getAppPath() {
			return build_data.app_path;
		},

		writeClient(dest) {
			return copy(`${config.outDir}/output/client`, dest, {
				// avoid making vite build artefacts public
				filter: (basename) => basename !== '.vite'
			});
		},

		writePrerendered(dest) {
			const source = `${config.outDir}/output/prerendered`;

			return [
				...copy(`${source}/pages`, dest),
				...copy(`${source}/dependencies`, dest),
				...copy(`${source}/data`, dest)
			];
		},

		writeServer(dest) {
			return copy(`${config.outDir}/output/server`, dest);
		},

		createInstrumentationInitializer({
			outputDirectory,
			environment,
			serverDirectory = `${config.outDir}/output/server`
		}) {
			const provider = path.join(outputDirectory, '__sveltekit_env.js');
			write(provider, environment ?? 'export default process.env;');

			const initializer = path.join(outputDirectory, '__sveltekit_env_init.js');
			write(
				initializer,
				create_env_module({
					environment: to_import_specifier(
						posixify(path.relative(path.dirname(initializer), provider))
					),
					set_env: to_import_specifier(
						posixify(path.relative(path.dirname(initializer), `${serverDirectory}/env.js`))
					)
				})
			);

			return initializer;
		},

		hasServerInstrumentationFile() {
			return existsSync(`${config.outDir}/output/server/instrumentation.server.js`);
		},

		instrument({
			entrypoint,
			instrumentation,
			start = path.join(path.dirname(entrypoint), 'start.js'),
			initializer,
			module = {
				exports: ['default']
			}
		}) {
			if (!existsSync(instrumentation)) {
				throw new Error(
					`Instrumentation file ${instrumentation} not found. This is probably a bug in your adapter.`
				);
			}
			if (!existsSync(entrypoint)) {
				throw new Error(
					`Entrypoint file ${entrypoint} not found. This is probably a bug in your adapter.`
				);
			}
			if (!existsSync(initializer)) {
				throw new Error(
					`Instrumentation initializer ${initializer} not found. This is probably a bug in your adapter.`
				);
			}

			copy(entrypoint, start);
			if (existsSync(`${entrypoint}.map`)) {
				copy(`${entrypoint}.map`, `${start}.map`);
			}

			const relative_instrumentation = posixify(
				path.relative(path.dirname(entrypoint), instrumentation)
			);
			const relative_start = posixify(path.relative(path.dirname(entrypoint), start));
			const relative_initializer = posixify(path.relative(path.dirname(entrypoint), initializer));

			const facade =
				'generateText' in module
					? module.generateText({
							instrumentation: relative_instrumentation,
							start: relative_start,
							initializer: relative_initializer
						})
					: create_instrumentation_facade({
							instrumentation: relative_instrumentation,
							start: relative_start,
							exports: module.exports,
							initializer: relative_initializer
						});

			rmSync(entrypoint, { force: true, recursive: true });
			write(entrypoint, facade);
		}
	};
}

/**
 * @param {string} file
 * @param {'gz' | 'br'} format
 */
async function compress_file(file, format = 'gz') {
	const compress =
		format == 'br'
			? zlib.createBrotliCompress({
					params: {
						[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
						[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
						[zlib.constants.BROTLI_PARAM_SIZE_HINT]: statSync(file).size
					}
				})
			: zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

	const source = createReadStream(file);
	const destination = createWriteStream(`${file}.${format}`);

	await pipe(source, compress, destination);
}

/**
 * Given a list of exports, generate a facade that:
 * - Imports the environment initializer
 * - Imports the instrumentation file
 * - Imports `exports` from the entrypoint (dynamically)
 * - Re-exports `exports` from the entrypoint
 *
 * @param {{ instrumentation: string; start: string; exports: string[]; initializer: string }} opts
 * @returns {string}
 */
function create_instrumentation_facade({ instrumentation, start, exports, initializer }) {
	const { namespace, declarations, reexports } = create_exported_declarations(
		exports,
		(name, ns) => `${ns}.${name}`,
		'__mod'
	);

	const parts = [
		`import ${JSON.stringify(to_import_specifier(initializer))};`,
		`import ${JSON.stringify(to_import_specifier(instrumentation))};`,
		`const ${namespace} = await import(${JSON.stringify(to_import_specifier(start))});`,
		declarations.join('\n'),
		reexports.length > 0 ? `export { ${reexports.join(', ')} };` : ''
	];

	return parts.filter(Boolean).join('\n');
}

/**
 * @param {string} path
 */
function to_import_specifier(path) {
	return path.startsWith('.') ? path : `./${path}`;
}

/**
 * @param {{ environment: string; set_env: string }} opts
 */
function create_env_module({ environment, set_env }) {
	return `import env from ${JSON.stringify(environment)};\nimport { set_env } from ${JSON.stringify(set_env)};\nset_env(env);\n`;
}
