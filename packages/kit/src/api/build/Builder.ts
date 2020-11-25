import { copy } from '@sveltejs/app-utils/files';
import { prerender } from '@sveltejs/app-utils/renderer';
import { Logger } from '@sveltejs/app-utils/renderer/prerender'; // TODO this is in the wrong place
import { ManifestData } from '../../interfaces';

export type BuilderOptions = {
	generated_files: string;
	static_files: string;
	log: Logger,
	manifest: ManifestData;
};

export default class Builder {
	log: Logger;

	#generated_files: string;
	#static_files: string;
	#manifest: ManifestData;

	constructor({
		generated_files,
		static_files,
		log,
		manifest
	}: BuilderOptions) {
		this.#generated_files = generated_files;
		this.#static_files = static_files;
		this.#manifest = manifest;

		this.log = log;
	}

	copy_generated_files(dest: string) {
		copy(this.#generated_files, dest);
	}

	copy_static_files(dest: string) {
		copy(this.#static_files, dest);
	}

	prerender({
		force = false,
		dest
	}: {
		force: boolean;
		dest: string;
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
