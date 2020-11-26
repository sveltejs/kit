import { rollup } from 'rollup';
import { copy } from '@sveltejs/app-utils/files';
import { prerender } from './prerender';

export default class Builder {
	#generated_files;
	#static_files;
	#manifest;

	constructor({
		generated_files,
		static_files,
		log,
		manifest
	}) {
		this.#generated_files = generated_files;
		this.#static_files = static_files;
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
		copy(this.#static_files, dest);
	}

	async prerender({
		force = false,
		dest
	}) {
		await prerender({
			out: dest,
			force,
			dir: this.#generated_files,
			manifest: this.#manifest,
			log: this.log
		});
	}
}
