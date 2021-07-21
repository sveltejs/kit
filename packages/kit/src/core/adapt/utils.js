import { SVELTE_KIT } from '../constants.js';
import { copy, rimraf, mkdirp } from '../filesystem/index.js';
import { prerender } from './prerender.js';
import fs from 'fs';
import { EOL } from 'os';

/**
 *
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

		/** @param {string} dest */
		copy_client_files(dest) {
			copy(`${cwd}/${SVELTE_KIT}/output/client`, dest, (file) => file[0] !== '.');
		},

		/** @param {string} dest */
		copy_server_files(dest) {
			copy(`${cwd}/${SVELTE_KIT}/output/server`, dest, (file) => file[0] !== '.');
		},

		/** @param {string} dest */
		copy_static_files(dest) {
			copy(config.kit.files.assets, dest);
		},

		/** @param {{ all: boolean, dest: string, fallback: string }} opts */
		async prerender({ all = false, dest, fallback }) {
			if (config.kit.prerender.enabled) {
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
		},

		/** @param {{patterns: string[], log?: boolean}} options */
		update_ignores({ patterns, log = true }) {
			const targets = ['.gitignore', '.prettierignore', '.eslintignore'];
			for (const target of targets) {
				if (!fs.existsSync(target)) continue;

				const file = fs.readFileSync(target, { encoding: 'utf-8' });
				const lines = file.split(/\r?\n/);
				const new_lines = new Set(patterns);
				// remove repeated lines
				for (const line of lines) {
					// this will prevent commented ignores to be reinserted
					new_lines.delete(line.replace(/#\s*/, ''));
				}
				if (new_lines.size === 0) continue;
				fs.writeFileSync(target, [...lines, ...new_lines].join(EOL));
				if (log) this.log.success(`Updated ${target}`);
			}
		}
	};
}
