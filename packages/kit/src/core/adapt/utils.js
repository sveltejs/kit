import { SVELTE_KIT } from '../constants.js';
import { copy, rimraf, mkdirp } from '../filesystem/index.js';
import { prerender } from './prerender.js';
import fs from 'fs';

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

		/** @param {{patterns: string[], generate?: boolean, log?: boolean}} options */
		update_ignores({ patterns, generate = false, log = true }) {
			const targets = ['.gitignore', '.prettierignore', '.eslintignore'];
			const title = '# Generated adapter output';
			let changed = false;
			// TODO: may be necessary to handle deletion of unused/old patterns
			for (const target of targets) {
				if (!fs.existsSync(target)) {
					if (!generate) continue;
					fs.writeFileSync(target, '');
				}
				const file = fs.readFileSync(target, { encoding: 'utf-8' });
				const lines = file.split(/\r?\n/);
				const start_index = lines.indexOf(title);

				// append to file
				if (start_index === -1) {
					let prefix = '';
					const last = lines[lines.length - 1];
					if (lines.length > 1) prefix += '\n';
					if (last.trim().length !== 0) prefix += '\n';

					fs.appendFileSync(target, [`${prefix}${title}`, ...patterns].join('\n'));
					changed = true;
					continue;
				}

				const new_lines = new Set(patterns);
				// remove repeated lines
				for (const line of lines) {
					// this will prevent commented ignores to be reinserted
					new_lines.delete(line.replace(/#\s*/, ''));
				}
				if (new_lines.size === 0) continue;

				let insertion_index = lines.length - 1;

				// find last empty line
				for (let i = start_index; i < lines.length; i++) {
					const line = lines[i];
					if (line.trim().length === 0) {
						insertion_index = i;
						break;
					}
				}

				lines.splice(insertion_index, 0, ...new_lines);
				fs.writeFileSync(target, lines.join('\n'));
				changed = true;
			}
			if (log && changed) {
				this.log.minor('Ignore files updated');
			}
		}
	};
}
