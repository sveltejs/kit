export function read_only_form_data() {
	/** @type {Map<string, string[]>} */
	const map = new Map();
	/** @type {Map<string, import('types/helper').File[]>} */
	const files = new Map();

	return {
		/**
		 * @param {string} key
		 * @param {string} value
		 */
		append(key, value) {
			if (map.has(key)) {
				(map.get(key) || []).push(value);
			} else {
				map.set(key, [value]);
			}
		},
		/**
		 * @param {string} key
		 * @param {import('types/helper').File} file
		 */
		appendFile(key, file) {
			if (files.has(key)) {
				(files.get(key) || []).push(file);
			} else {
				files.set(key, [file]);
			}
		},
		data: new ReadOnlyFormData(map, files)
	};
}

class ReadOnlyFormData {
	/** @type {Map<string, string[]>} */
	#map;

	/** @type {Map<string, import('types/helper').File[]>} */
	#files;

	/**
	 * @param {Map<string, string[]>} map
	 * @param {Map<string, import('types/helper').File[]>} files
	 */
	constructor(map, files) {
		this.#map = map;
		this.#files = files;
	}

	/** @param {string} key */
	get(key) {
		const value = this.#map.get(key);
		return value && value[0];
	}

	/** @param {string} key */
	getAll(key) {
		return this.#map.get(key);
	}

	/** @param {string} key */
	file(key) {
		const file = this.#files.get(key);
		return file && file[0];
	}

	/** @param {string} key */
	files(key) {
		return this.#files.get(key);
	}

	/** @param {string} key */
	has(key) {
		return this.#map.has(key);
	}

	*[Symbol.iterator]() {
		for (const [key, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield [key, value[i]];
			}
		}
	}

	*entries() {
		for (const [key, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield [key, value[i]];
			}
		}
	}

	*keys() {
		for (const [key] of this.#map) yield key;
	}

	*values() {
		for (const [, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield value[i];
			}
		}
	}
}
