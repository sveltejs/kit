import { copy } from '@sveltejs/app-utils/files';
import { prerender } from './prerender.js';

export default class Builder {
	#cwd;
	#config;

	constructor({ cwd, config, log }) {
		this.#cwd = cwd;
		this.#config = config;

		this.log = log;
	}

	copy_client_files(dest) {
		copy(`${this.#cwd}/client`, dest, (file) => file[0] !== '.');
	}

	copy_server_files(dest) {
		copy(`${this.#cwd}/server`, dest, (file) => file[0] !== '.');
	}

	copy_static_files(dest) {
		copy(this.#config.files.assets, dest);
	}

	async prerender({ force = false, dest }) {
		if (this.#config.prerender.enabled) {
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
