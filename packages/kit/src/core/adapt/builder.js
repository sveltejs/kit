import { copy, rimraf, mkdirp } from '../../utils/filesystem.js';
import { generate_manifest } from '../generate_manifest/index.js';

/**
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   build_data: import('types').BuildData;
 *   prerendered: import('types').Prerendered;
 *   log: import('types').Logger;
 * }} opts
 * @returns {import('types').Builder}
 */
export function create_builder({ config, build_data, prerendered, log }) {
	/** @type {Set<string>} */
	const prerendered_paths = new Set(prerendered.paths);

	/** @param {import('types').RouteData} route */
	// TODO routes should come pre-filtered
	function not_prerendered(route) {
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

		config,
		prerendered,

		createEntries(fn) {
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
				routes: build_data.manifest_data.routes.filter(not_prerendered),
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

		writeClient(dest) {
			return copy(`${config.kit.outDir}/output/client`, dest, {
				filter: (file) => file[0] !== '.'
			});
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
			return copy(`${config.kit.outDir}/output/server`, dest, {
				filter: (file) => file[0] !== '.'
			});
		},

		writeStatic(dest) {
			return copy(config.kit.files.assets, dest);
		},

		// @ts-expect-error
		async prerender() {
			throw new Error(
				'builder.prerender() has been removed. Prerendering now takes place in the build phase — see builder.prerender and builder.writePrerendered'
			);
		}
	};
}
