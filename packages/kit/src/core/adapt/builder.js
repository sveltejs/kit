import { existsSync, statSync, createReadStream, createWriteStream } from 'node:fs';
import { extname, resolve } from 'node:path';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { copy, rimraf, mkdirp, resolve_entry } from '../../utils/filesystem.js';
import { generate_manifest } from '../generate_manifest/index.js';
import { get_route_segments } from '../../utils/routing.js';
import { get_env } from '../../exports/vite/utils.js';
import generate_fallback from '../postbuild/fallback.js';
import { write } from '../sync/utils.js';
import { list_files } from '../utils.js';
import { concat } from '../../utils/set.js';

const pipe = promisify(pipeline);
const extensions = ['.html', '.js', '.mjs', '.json', '.css', '.svg', '.xml', '.wasm'];

/**
 * Creates the Builder which is passed to adapters for building the application.
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   build_data: import('types').BuildData;
 *   server_metadata: import('types').ServerMetadata;
 *   route_data: import('types').RouteData[];
 *   prerendered: import('types').Prerendered;
 *   prerender_map: import('types').PrerenderMap;
 *   log: import('types').Logger;
 *   vite_config: import('vite').ResolvedConfig;
 * }} opts
 * @returns {import('@sveltejs/kit').Builder}
 */
export function create_builder({
	config,
	build_data,
	server_metadata,
	route_data,
	prerendered,
	prerender_map,
	log,
	vite_config
}) {
	/** @type {Map<import('@sveltejs/kit').RouteDefinition, import('types').RouteData>} */
	const lookup = new Map();

	/**
	 * Rather than exposing the internal `RouteData` type, which is subject to change,
	 * we expose a stable type that adapters can use to group/filter routes
	 */
	const routes = route_data.map((route) => {
		const { config, methods, page, api } = /** @type {import('types').ServerMetadataRoute} */ (
			server_metadata.routes.get(route.id)
		);

		/** @type {import('@sveltejs/kit').RouteDefinition} */
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

	/**
	 * @type {{
	 * 	routes: Map<string, string[]>;
	 * 	root_error_page: string[];
	 * 	hooks: string[];
	 * } | undefined}
	 */
	let server_assets;

	return {
		log,
		rimraf,
		mkdirp,
		copy,

		config,
		prerendered,
		routes,

		async compress(directory) {
			if (!existsSync(directory)) {
				return;
			}

			const files = list_files(directory, (file) => extensions.includes(extname(file))).map(
				(file) => resolve(directory, file)
			);

			await Promise.all(
				files.flatMap((file) => [compress_file(file, 'gz'), compress_file(file, 'br')])
			);
		},

		async createEntries(fn) {
			const seen = new Set();

			for (let i = 0; i < route_data.length; i += 1) {
				const route = route_data[i];
				if (prerender_map.get(route.id) === true) continue;
				const { id, filter, complete } = fn(routes[i]);

				if (seen.has(id)) continue;
				seen.add(id);

				const group = [route];

				// figure out which lower priority routes should be considered fallbacks
				for (let j = i + 1; j < route_data.length; j += 1) {
					if (prerender_map.get(routes[j].id) === true) continue;
					if (filter(routes[j])) {
						group.push(route_data[j]);
					}
				}

				const filtered = new Set(group);

				// heuristic: if /foo/[bar] is included, /foo/[bar].json should
				// also be included, since the page likely needs the endpoint
				// TODO is this still necessary, given the new way of doing things?
				filtered.forEach((route) => {
					if (route.page) {
						const endpoint = route_data.find((candidate) => candidate.id === route.id + '.json');

						if (endpoint) {
							filtered.add(endpoint);
						}
					}
				});

				if (filtered.size > 0) {
					await complete({
						generateManifest: ({ relativePath }) =>
							generate_manifest({
								build_data,
								relative_path: relativePath,
								routes: Array.from(filtered)
							})
					});
				}
			}
		},

		async generateFallback(dest) {
			const manifest_path = `${config.kit.outDir}/output/server/manifest-full.js`;
			const env = get_env(config.kit.env, vite_config.mode);

			const fallback = await generate_fallback({
				manifest_path,
				env: { ...env.private, ...env.public }
			});

			write(dest, fallback);
		},

		generateEnvModule() {
			const dest = `${config.kit.outDir}/output/prerendered/dependencies/${config.kit.appDir}/env.js`;
			const env = get_env(config.kit.env, vite_config.mode);

			write(dest, `export const env=${JSON.stringify(env.public)}`);
		},

		generateManifest({ relativePath, routes: subset }) {
			return generate_manifest({
				build_data,
				relative_path: relativePath,
				routes: subset
					? subset.map((route) => /** @type {import('types').RouteData} */ (lookup.get(route)))
					: route_data.filter((route) => prerender_map.get(route.id) !== true)
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

		getServerAssets() {
			if (server_assets) {
				return {
					routes: server_assets.routes,
					hooks: server_assets.hooks,
					rootErrorPage: server_assets.root_error_page
				};
			}

			/** @type {Set<string>} */
			let asset_chunks = new Set();

			for (const [filename, meta] of Object.entries(build_data.server_manifest)) {
				if (filename.startsWith('_') && meta.assets) {
					asset_chunks = concat(asset_chunks, meta.assets);
				}
			}

			/**
			 * @param {string | undefined} filename
			 * @returns {Set<string>}
			 */
			function get_server_assets(filename) {
				if (!filename || !build_data.server_manifest[filename]) {
					return /** @type {Set<string>} */ (new Set());
				}
				const { imports, assets } = build_data.server_manifest[filename];

				/** @type {Set<string>} */
				let server_assets = new Set();

				if (imports) {
					server_assets = concat(
						server_assets,
						imports.filter((file) => asset_chunks.has(file))
					);
				}

				if (assets) {
					server_assets = concat(server_assets, assets);
				}

				return server_assets;
			}

			/**
			 * @param {{
			 *   component?: string;
			 *   server?: string;
			 *   universal?: string;
			 *   parent?: import('types').PageNode;
			 * }} node
			 * @returns
			 */
			function get_server_load_assets({ server, parent }) {
				let server_assets = concat(
					/** @type {Set<string>}*/ (new Set()),
					get_server_assets(server)
				);

				if (parent) {
					server_assets = concat(server_assets, get_server_load_assets(parent));
				}

				return server_assets;
			}

			function get_root_error_page_assets() {
				const route = route_data.find((route) => route.leaf);
				if (!route || !route.leaf) {
					return /** @type {string[]}*/ ([]);
				}

				let assets = new Set();

				let layout = route.leaf.parent;
				while (layout) {
					assets = concat(assets, get_server_load_assets(layout));
					layout = layout.parent;
				}

				return [...assets];
			}

			/** @type {Map<string, string[]>} */
			const routes = new Map();
			route_data.forEach((route) => {
				/** @type {Set<string>} */
				let server_assets = new Set();

				if (route.leaf) {
					server_assets = concat(server_assets, get_server_load_assets(route.leaf));
				}

				if (route.endpoint) {
					server_assets = concat(server_assets, get_server_assets(route.endpoint.file));
				}

				routes.set(route.id, Array.from(server_assets));
			});

			const server_hooks_path = resolve_entry(config.kit.files.hooks.server)?.slice(
				process.cwd().length + 1
			);

			server_assets = {
				routes,
				hooks: [...get_server_assets(server_hooks_path)],
				root_error_page: get_root_error_page_assets()
			};

			return {
				routes: server_assets.routes,
				hooks: server_assets.hooks,
				rootErrorPage: server_assets.root_error_page
			};
		},

		writeClient(dest) {
			return copy(`${config.kit.outDir}/output/client`, dest, {
				// avoid making vite build artefacts public
				filter: (basename) => basename !== '.vite'
			});
		},

		writePrerendered(dest) {
			const source = `${config.kit.outDir}/output/prerendered`;
			return [...copy(`${source}/pages`, dest), ...copy(`${source}/dependencies`, dest)];
		},

		writeServer(dest) {
			return copy(`${config.kit.outDir}/output/server`, dest);
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
