/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { Builder } from '@sveltejs/kit' */
/** @import { ResolvedConfig } from 'vite' */
/** @import { RouteDefinition, EnvVarConfig } from '@sveltejs/kit' */
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
import { extname, resolve, join, dirname, relative } from 'node:path';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { copy } from '../../utils/filesystem.js';
import { posixify } from '../../utils/os.js';
import { generate_manifest } from '../generate_manifest/index.js';
import { get_route_segments } from '../../utils/routing.js';
import generate_fallback from '../postbuild/fallback.js';
import { write } from '../sync/utils.js';
import { list_files } from '../utils.js';
import { find_server_assets } from '../generate_manifest/find_server_assets.js';
import { create_exported_declarations } from '../env.js';
import { handle_issues, validate } from '../../exports/internal/env.js';

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

	return {
		log,
		rimraf: (dir) => rmSync(dir, { force: true, recursive: true }),
		mkdirp: (dir) => mkdirSync(dir, { recursive: true }),
		copy,

		config,
		prerendered,
		routes,

		async compress(directory) {
			if (!existsSync(directory)) {
				return [];
			}

			const files = list_files(directory, (file) => extensions.includes(extname(file)));

			await Promise.all(
				files.flatMap((file) => {
					const abs = resolve(directory, file);
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
			const manifest_path = `${config.kit.outDir}/output/server/manifest-full.js`;
			const env = loadEnv(vite_config.mode, config.kit.env.dir, '');

			const fallback = await generate_fallback({
				manifest_path,
				env,
				out_dir: config.kit.outDir,
				origin: config.kit.paths.origin || 'http://sveltekit-prerender',
				assets: config.kit.files.assets
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

			const dest = `${config.kit.outDir}/output/prerendered/dependencies/${config.kit.appDir}`;
			const env = loadEnv(vite_config.mode, config.kit.env.dir, '');

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

		generateManifest({ relativePath, routes: subset }) {
			return generate_manifest({
				build_data,
				prerendered: prerendered.paths,
				relative_path: relativePath,
				routes: subset
					? subset.map((route) => /** @type {import('types').RouteData} */ (lookup.get(route)))
					: route_data.filter((route) => prerender_map.get(route.id) !== true),
				remotes,
				root: vite_config.root
			});
		},

		getBuildDirectory(name) {
			return `${config.kit.outDir}/${name}`;
		},

		getClientDirectory() {
			return `${config.kit.outDir}/output/client`;
		},

		getServerDirectory() {
			return `${config.kit.outDir}/output/server`;
		},

		getAppPath() {
			return build_data.app_path;
		},

		writeClient(dest) {
			return copy(`${config.kit.outDir}/output/client`, dest, {
				// avoid making vite build artefacts public
				filter: (basename) => basename !== '.vite'
			});
		},

		writePrerendered(dest) {
			const source = `${config.kit.outDir}/output/prerendered`;

			return [
				...copy(`${source}/pages`, dest),
				...copy(`${source}/dependencies`, dest),
				...copy(`${source}/data`, dest)
			];
		},

		writeServer(dest) {
			return copy(`${config.kit.outDir}/output/server`, dest);
		},

		hasServerInstrumentationFile() {
			return existsSync(`${config.kit.outDir}/output/server/instrumentation.server.js`);
		},

		instrument({
			entrypoint,
			instrumentation,
			start = join(dirname(entrypoint), 'start.js'),
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

			copy(entrypoint, start);
			if (existsSync(`${entrypoint}.map`)) {
				copy(`${entrypoint}.map`, `${start}.map`);
			}

			const relative_instrumentation = posixify(relative(dirname(entrypoint), instrumentation));
			const relative_start = posixify(relative(dirname(entrypoint), start));

			const facade =
				'generateText' in module
					? module.generateText({
							instrumentation: relative_instrumentation,
							start: relative_start
						})
					: create_instrumentation_facade({
							instrumentation: relative_instrumentation,
							start: relative_start,
							exports: module.exports
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
 * - Imports the instrumentation file
 * - Imports `exports` from the entrypoint (dynamically, if `tla` is true)
 * - Re-exports `exports` from the entrypoint
 *
 * @param {{ instrumentation: string; start: string; exports: string[] }} opts
 * @returns {string}
 */
function create_instrumentation_facade({ instrumentation, start, exports }) {
	const import_instrumentation = `import './${instrumentation}';`;

	const { namespace, declarations, reexports } = create_exported_declarations(
		exports,
		(name, ns) => `${ns}.${name}`,
		'__mod'
	);

	const parts = [
		`const ${namespace} = await import('./${start}');`,
		declarations.join('\n'),
		reexports.length > 0 ? `export { ${reexports.join(', ')} };` : ''
	]
		.filter(Boolean)
		.join('\n');

	return `${import_instrumentation}\n${parts}`;
}
