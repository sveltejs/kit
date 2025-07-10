import { dirname, join } from 'node:path';
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// This file will exist within the server folder, which is next to the prerendered folder
const dir = join(dirname(dirname(fileURLToPath(import.meta.url))), 'prerendered');

class Cache {
	/**
	 * @param {string} id - The unique identifier for the cache instance
	 * @param {number | false} expiration - The expiration time in milliseconds
	 */
	constructor(id, expiration) {
		this.id = id;
		this.expiration = typeof expiration === 'number' ? expiration * 1000 : expiration;
		this.memory_cache = new Map(); // In-memory cache to store output and write time
	}

	/** @param {string} input */
	path(input) {
		return join(dir, encodeURIComponent(this.id + '|' + input));
	}

	/** @param {string} input */
	get(input) {
		const now = Date.now();

		// Check in-memory cache
		if (this.memory_cache.has(input)) {
			const { output, timestamp } = this.memory_cache.get(input);
			if (this.expiration === false || now - timestamp <= this.expiration) {
				return output;
			} else {
				this.delete(input);
			}
		}

		// Check file system
		const file_path = this.path(input);
		if (existsSync(file_path)) {
			const stats = statSync(file_path);
			const last_modified = stats.mtimeMs;

			if (this.expiration === false || now - last_modified <= this.expiration) {
				const output = readFileSync(file_path, 'utf-8');
				this.memory_cache.set(input, { output, timestamp: now });
				return output;
			} else {
				this.delete(input);
			}
		}

		return undefined;
	}

	/**
	 * @param {string} input
	 * @param {string} output
	 */
	set(input, output) {
		const now = Date.now();
		this.memory_cache.set(input, { output, timestamp: now });
		writeFileSync(this.path(input), output, 'utf-8');

		if (typeof this.expiration === 'number') {
			setTimeout(() => {
				this.delete(input);
			}, this.expiration);
		}
	}

	/** @param {string} input */
	delete(input) {
		this.memory_cache.delete(input);
		const file_path = this.path(input);
		if (existsSync(file_path)) {
			rmSync(file_path);
		}
	}
}

/** @param {any} cache_fn */
export default function add_cache(cache_fn) {
	// For __ see the RemoteInfo type
	if (cache_fn.__?.type !== 'cache') return;
	cache_fn.cache = new Cache(cache_fn.__.id, cache_fn.__.config.expiration);
}
