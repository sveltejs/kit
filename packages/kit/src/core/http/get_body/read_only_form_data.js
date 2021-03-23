export function read_only_form_data() {
	/** @type {Map<string, string[]>} */
	const map = new Map();

	return {
		/**
		 * @param {string} key
		 * @param {string} value
		 */
		append(key, value) {
			if (map.has(key)) {
				map.get(key).push(value);
			} else {
				map.set(key, [value]);
			}
		},

		data: new ReadOnlyFormData(map)
	};
}

class ReadOnlyFormData {
	/** @type {Map<string, string[]>} */
	#map;

	/** @param {Map<string, string[]>} map */
	constructor(map) {
		this.#map = map;
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
		for (const [key, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield key;
			}
		}
	}

	*values() {
		for (const [, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield value;
			}
		}
	}
}
