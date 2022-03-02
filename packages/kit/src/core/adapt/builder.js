import { copy, rimraf, mkdirp } from '../../utils/filesystem.js';
import { prerender } from './prerender/prerender.js';
import { generate_manifest } from '../generate_manifest/index.js';

/**
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   build_data: import('types').BuildData;
 *   log: import('types').Logger;
 * }} opts
 * @returns {import('types').Builder}
 */
export function create_builder({ config, build_data, log }) {
	/** @type {Set<string>} */
	let prerendered_paths;

	let generated_manifest = false;

	/** @param {import('types').RouteData} route */
	function not_prerendered(route) {
		if (!prerendered_paths) return true;

		if (route.type === 'page' && route.path) {
			return !prerendered_paths.has(route.path);
		}

		return true;
	}

	return {
		log,
		rimraf,
		mkdirp,
		copy,

		appDir: config.kit.appDir,
		trailingSlash: config.kit.trailingSlash,

		createEntries(fn) {
			generated_manifest = true;

			const { routes } = build_data.manifest_data;

			/** @type {import('types').RouteDefinition[]} */
			const facades = routes.map((route) => ({
				type: route.type,
				segments: route.segments,
				pattern: route.pattern,
				methods: route.type === 'page' ? ['get'] : build_data.server.methods[route.file]
			}));

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

				const filtered = new Set(group.filter(not_prerendered));

				// heuristic: if /foo/[bar] is included, /foo/[bar].json should
				// also be included, since the page likely needs the endpoint
				filtered.forEach((route) => {
					if (route.type === 'page') {
						const length = route.segments.length;

						const endpoint = routes.find((candidate) => {
							if (candidate.segments.length !== length) return false;

							for (let i = 0; i < length; i += 1) {
								const a = route.segments[i];
								const b = candidate.segments[i];

								if (i === length - 1) {
									return b.content === `${a.content}.json`;
								}

								if (a.content !== b.content) return false;
							}
						});

						if (endpoint) {
							filtered.add(endpoint);
						}
					}
				});

				if (filtered.size > 0) {
					complete({
						generateManifest: ({ relativePath, format }) =>
							generate_manifest(build_data, relativePath, Array.from(filtered), format)
					});
				}
			}
		},

		generateManifest: ({ relativePath, format }) => {
			generated_manifest = true;
			return generate_manifest(
				build_data,
				relativePath,
				build_data.manifest_data.routes.filter(not_prerendered),
				format
			);
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

		writeClient(dest) {
			return copy(`${config.kit.outDir}/output/client`, dest, {
				filter: (file) => file[0] !== '.'
			});
		},

		writeServer(dest) {
			return copy(`${config.kit.outDir}/output/server`, dest, {
				filter: (file) => file[0] !== '.'
			});
		},

		writeStatic(dest) {
			return copy(config.kit.files.assets, dest);
		},

		async prerender({ all = false, dest, fallback }) {
			if (generated_manifest) {
				throw new Error(
					'Adapters must call prerender(...) before createEntries(...) or generateManifest(...)'
				);
			}

			const prerendered = await prerender({
				out: dest,
				all,
				config,
				build_data,
				fallback,
				log
			});

			prerendered_paths = new Set(prerendered.paths);

			return prerendered;
		}
	};
}
