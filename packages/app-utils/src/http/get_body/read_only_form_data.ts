type FormDataMap = Map<string, string[]>;

export function read_only_form_data() {
	const map: FormDataMap = new Map();

	return {
		append(key: string, value: string) {
			if (map.has(key)) {
				(map.get(key) as string[]).push(value);
			} else {
				map.set(key, [value]);
			}
		},

		data: new ReadOnlyFormData(map)
	};
}

class ReadOnlyFormData {
	#map: FormDataMap;

	constructor(map: FormDataMap) {
		this.#map = map;
	}

	get(key: string) {
		return this.#map.get(key)?.[0];
	}

	getAll(key: string) {
		return this.#map.get(key);
	}

	has(key: string) {
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
