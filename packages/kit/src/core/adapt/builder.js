import glob from 'tiny-glob';
import zlib from 'zlib';
import { existsSync, statSync, createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { copy, rimraf, mkdirp } from '../../utils/filesystem.js';
import { generate_manifest } from '../generate_manifest/index.js';
import { get_route_segments } from '../../utils/routing.js';

const pipe = promisify(pipeline);

/**
 * Creates the Builder which is passed to adapters for building the application.
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   build_data: import('types').BuildData;
 *   routes: import('types').RouteData[];
 *   prerendered: import('types').Prerendered;
 *   log: import('types').Logger;
 * }} opts
 * @returns {import('types').Builder}
 */
export function create_builder({ config, build_data, routes, prerendered, log }) {
	return {
		log,
		rimraf,
		mkdirp,
		copy,

		config,
		prerendered,

		async createEntries(fn) {
			/** @type {import('types').RouteDefinition[]} */
			const facades = routes.map((route) => {
				/** @type {Set<import('types').HttpMethod>} */
				const methods = new Set();

				if (route.page) {
					methods.add('GET');
				}

				if (route.endpoint) {
					for (const method of build_data.server.methods[route.endpoint.file]) {
						methods.add(method);
					}
				}

				return {
					id: route.id,
					segments: get_route_segments(route.id).map((segment) => ({
						dynamic: segment.includes('['),
						rest: segment.includes('[...'),
						content: segment
					})),
					pattern: route.pattern,
					methods: Array.from(methods)
				};
			});

			const seen = new Set();

			for (let i = 0; i < routes.length; i += 1) {
				const route = routes[i];
				const { id, filter, complete } = fn(facades[i]);

				if (seen.has(id)) continue;
				seen.add(id);

				const group = [route];

				// figure out which lower priority routes should be considered fallbacks
				for (let j = i + 1; j < routes.length; j += 1) {
					if (filter(facades[j])) {
						group.push(routes[j]);
					}
				}

				const filtered = new Set(group);

				// heuristic: if /foo/[bar] is included, /foo/[bar].json should
				// also be included, since the page likely needs the endpoint
				// TODO is this still necessary, given the new way of doing things?
				filtered.forEach((route) => {
					if (route.page) {
						const endpoint = routes.find((candidate) => candidate.id === route.id + '.json');

						if (endpoint) {
							filtered.add(endpoint);
						}
					}
				});

				if (filtered.size > 0) {
					await complete({
						generateManifest: ({ relativePath, format }) =>
							generate_manifest({
								build_data,
								relative_path: relativePath,
								routes: Array.from(filtered),
								format
							})
					});
				}
			}
		},

		generateManifest: ({ relativePath, format }) => {
			return generate_manifest({
				build_data,
				relative_path: relativePath,
				routes,
				format
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

		getStaticDirectory() {
			return config.kit.files.assets;
		},

		getAppPath() {
			return build_data.app_path;
		},

		writeClient(dest) {
			return [...copy(`${config.kit.outDir}/output/client`, dest)];
		},

		writePrerendered(dest, { fallback } = {}) {
			const source = `${config.kit.outDir}/output/prerendered`;
			const files = [...copy(`${source}/pages`, dest), ...copy(`${source}/dependencies`, dest)];

			if (fallback) {
				files.push(fallback);
				copy(`${source}/fallback.html`, `${dest}/${fallback}`);
			}

			return files;
		},

		writeServer(dest) {
			return copy(`${config.kit.outDir}/output/server`, dest);
		},

		// TODO remove these methods for 1.0
		// @ts-expect-error
		writeStatic() {
			throw new Error(
				`writeStatic has been removed. Please ensure you are using the latest version of ${
					config.kit.adapter.name || 'your adapter'
				}`
			);
		},

		async compress(directory) {
			if (!existsSync(directory)) {
				return;
			}

			const files = await glob('**/*.{html,js,json,css,svg,xml,wasm}', {
				cwd: directory,
				dot: true,
				absolute: true,
				filesOnly: true
			});

			await Promise.all(
				files.map((file) => Promise.all([compress_file(file, 'gz'), compress_file(file, 'br')]))
			);
		},

		async prerender() {
			throw new Error(
				'builder.prerender() has been removed. Prerendering now takes place in the build phase — see builder.prerender and builder.writePrerendered'
			);
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
