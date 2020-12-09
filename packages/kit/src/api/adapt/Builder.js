import { copy } from '@sveltejs/app-utils/files';
import { prerender } from './prerender';

export default class Builder {
	#generated_files;
	#config;
	#manifest;

	constructor({ generated_files, config, log, manifest }) {
		this.#generated_files = generated_files;
		this.#config = config;
		this.#manifest = manifest;

		this.log = log;
	}

	copy_client_files(dest) {
		copy(`${this.#generated_files}/client`, dest, (file) => file[0] !== '.');
	}

	copy_server_files(dest) {
		copy(`${this.#generated_files}/server`, dest, (file) => file[0] !== '.');
	}

	copy_static_files(dest) {
		copy(this.#config.files.static, dest);
	}

	async prerender({ force = false, dest }) {
		await prerender({
			out: dest,
			force,
			dir: this.#generated_files,
			manifest: this.#manifest,
			config: this.#config,
			log: this.log
		});
	}
}
