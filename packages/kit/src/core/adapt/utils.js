import { SVELTE_KIT } from '../constants.js';
import { copy, rimraf, mkdirp } from '../../utils/filesystem.js';
import { prerender } from './prerender.js';
import { generate_manifest } from '../generate_manifest/index.js';

/**
 * @param {{
 *   cwd: string;
 *   config: import('types/config').ValidatedConfig;
 *   build_data: import('types/internal').BuildData;
 *   log: import('types/internal').Logger;
 * }} opts
 * @returns {import('types/config').AdapterUtils}
 */
export function get_utils({ cwd, config, build_data, log }) {
	return {
		log,
		rimraf,
		mkdirp,
		copy,

		createEntries(fn) {
			/** @type {import('types/config').AdapterEntry[]} */
			const entries = [];

			const { routes } = build_data.manifest_data;

			/** @type {import('types/config').RouteDefinition[]} */
			const facades = routes.map((route) => ({
				type: route.type,
				segments: route.segments,
				pattern: route.pattern,
				methods: route.type === 'page' ? ['get'] : build_data.server.methods[route.file]
			}));

			const seen = new Set();

			for (let i = 0; i < routes.length; i += 1) {
				const route = routes[i];
				const { id, data, filter } = fn(facades[i]);

				if (seen.has(id)) continue;
				seen.add(id);

				const group = [route];

				for (let j = i + 1; j < routes.length; j += 1) {
					if (filter(facades[j])) {
						group.push(routes[j]);
					}
				}

				entries.push({
					id,
					data,
					manifest: ({ relativePath }) => generate_manifest(build_data, relativePath, group)
				});
			}

			return entries;
		},

		writeClient(dest) {
			return copy(`${cwd}/${SVELTE_KIT}/output/client`, dest, {
				filter: (file) => file[0] !== '.'
			});
		},

		writeServer(dest) {
			return copy(`${cwd}/${SVELTE_KIT}/output/server`, dest, {
				filter: (file) => file[0] !== '.'
			});
		},

		writeStatic(dest) {
			return copy(config.kit.files.assets, dest);
		},

		async prerender({ all = false, dest, fallback }) {
			await prerender({
				out: dest,
				all,
				cwd,
				config,
				build_data,
				fallback,
				log
			});
		}
	};
}
