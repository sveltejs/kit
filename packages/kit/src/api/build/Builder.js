import { copy } from '@sveltejs/app-utils/files';
import { prerender } from '@sveltejs/app-utils/renderer';

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

	copy_generated_files(dest) {
		copy(this.#generated_files, dest);
	}

	copy_static_files(dest) {
		copy(this.#static_files, dest);
	}

	prerender({
		force = false,
		dest
	}) {
		prerender({
			out: dest,
			force,
			dir: this.#generated_files,
			manifest: this.#manifest,
			log: this.log
		});
	}

	foo() {
		console.log(this.#manifest);
	}
}
