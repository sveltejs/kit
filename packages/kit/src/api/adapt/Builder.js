import { copy } from '@sveltejs/app-utils/files';
import { prerender } from './prerender.js';

export default class Builder {
	#cwd;
	#config;

	/** @param {{
	 *   cwd: string;
	 *   config: any; // TODO
	 *   log: import('../../types').Logger
	 * }} opts */
	constructor({ cwd, config, log }) {
		this.#cwd = cwd;
		this.#config = config;

		this.log = log;
	}

	/** @param {string} dest */
	copy_client_files(dest) {
		copy(`${this.#cwd}/client`, dest, (file) => file[0] !== '.');
	}

	/** @param {string} dest */
	copy_server_files(dest) {
		copy(`${this.#cwd}/server`, dest, (file) => file[0] !== '.');
	}

	/** @param {string} dest */
	copy_static_files(dest) {
		copy(this.#config.kit.files.assets, dest);
	}

	/** @param {{ force: boolean, dest: string }} opts */
	async prerender({ force = false, dest }) {
		if (this.#config.kit.prerender.enabled) {
			await prerender({
				out: dest,
				force,
				dir: this.#cwd,
				config: this.#config,
				log: this.log
			});
		}
	}
}
