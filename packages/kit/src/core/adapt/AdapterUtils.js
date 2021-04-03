import { copy, rimraf, mkdirp } from '../filesystem/index.js';
import { prerender } from './prerender.js';

export default class AdapterUtils {
	#cwd;
	#config;

	/** @param {{
	 *   cwd: string;
	 *   config: any; // TODO
	 *   log: import('../../../types.internal').Logger
	 * }} opts */
	constructor({ cwd, config, log }) {
		this.#cwd = cwd;
		this.#config = config;

		this.log = log;
	}

	/** @param {string} dest */
	copy_client_files(dest) {
		copy(`${this.#cwd}/.svelte/output/client`, dest, (file) => file[0] !== '.');
	}

	/** @param {string} dest */
	copy_server_files(dest) {
		copy(`${this.#cwd}/.svelte/output/server`, dest, (file) => file[0] !== '.');
	}

	/** @param {string} dest */
	copy_static_files(dest) {
		copy(this.#config.kit.files.assets, dest);
	}

	/** @param {string} path */
	rimraf(path) {
		rimraf(path);
	}

	/**
	 * @param {string} from
	 * @param {string} to
	 * @param {(basename: string) => boolean} filter
	 */
	copy(from, to, filter = () => true) {
		copy(from, to, filter);
	}

	/** @param {string} dir */
	mkdirp(dir) {
		mkdirp(dir);
	}

	/** @param {{ force: boolean, dest: string }} opts */
	async prerender({ force = false, dest }) {
		if (this.#config.kit.prerender.enabled) {
			await prerender({
				out: dest,
				force,
				cwd: this.#cwd,
				config: this.#config,
				log: this.log
			});
		}
	}
}
