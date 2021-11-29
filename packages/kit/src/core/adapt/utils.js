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

		generateManifest({ relativePath = '.', scope: _ }) {
			return generate_manifest(
				relativePath,
				build_data.manifest_data,
				build_data.client_entry_file,
				build_data.client.manifest,
				build_data.server.manifest
			);
		},

		routes: build_data.manifest_data.routes.map((route) => {
			return {
				type: route.type,
				segments: route.segments,
				pattern: route.pattern,
				methods: route.type === 'page' ? ['get'] : build_data.server.methods[route.file]
			};
		}),

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
