import { SVELTE_KIT } from '../constants.js';
import { copy, rimraf, mkdirp } from '../filesystem/index.js';
import { prerender } from './prerender.js';

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

		copy_client_files(dest) {
			copy(`${cwd}/${SVELTE_KIT}/output/client`, dest, (file) => file[0] !== '.');
		},

		copy_server_files(dest) {
			copy(`${cwd}/${SVELTE_KIT}/output/server`, dest, (file) => file[0] !== '.');
		},

		copy_static_files(dest) {
			copy(config.kit.files.assets, dest);
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
