import { dirname, join } from 'node:path';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// This file will exist within the server folder, which is next to the prerendered folder
const dir = join(dirname(dirname(fileURLToPath(import.meta.url))), 'prerendered');

class Cache {
	/**
	 * @param {string} id - The unique identifier for the cache instance
	 * @param {number} expiration - The expiration time in miliseconds
	 */
	constructor(id, expiration) {
		this.id = id;
		this.expiration = expiration;
	}

	/** @param {string} input */
	path(input) {
		return join(dir, encodeURIComponent(this.id + '|' + input));
	}
	/** @param {string} input */
	has(input) {
		return existsSync(this.path(input));
	}
	/** @param {string} input */
	get(input) {
		return readFileSync(this.path(input));
	}
	/**
	 * @param {string} input
	 * @param {string} output
	 */
	set(input, output) {
		writeFileSync(this.path(input), output, 'utf-8');
		// TODO use more robust approach, i.e. reading the last write from the file system and delete inside has/get when it's too old
		setTimeout(() => {
			this.delete(input);
		}, this.expiration);
	}
	/** @param {string} input */
	delete(input) {
		rmSync(this.path(input));
	}
}

/** @param {any} cache_fn */
export default function add_cache(cache_fn) {
	if (cache_fn.__type !== 'cache') return;
	cache_fn.cache = new Cache(cache_fn.__id, cache_fn.__config.expiration * 1000);
}
