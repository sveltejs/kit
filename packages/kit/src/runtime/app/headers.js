/**
 * @type {import("../../../types.internal").Headers}
 */
export class Headers {
	/**
	 * @param {Record<string,string|string[]>} [headers]
	 */
	constructor(headers) {
		this.headers = lowercase_keys(headers) || {};
	}

	/**
	 * @param {string} key
	 * @param {string} value
	 */
	set(key, value) {
		this.headers[key.toLowerCase()] = value;
	}

	/**
	 * @param {string} key
	 * @returns {string}
	 */
	get(key) {
		key = key.toLowerCase();
		if (Array.isArray(this.headers[key])) {
			if (this.headers[key].length > 1) {
				throw new Error(`Called get but multiple headers found for ${key}`);
			}
			return this.headers[key][0];
		}
		return /** @type {string} */ (this.headers[key]);
	}

	/**
	 * @param {string} key
	 * @returns {string[]}
	 */
	getAll(key) {
		key = key.toLowerCase();
		if (typeof this.headers[key] === 'string') {
			return [/** @type {string} */ (this.headers[key])];
		}
		if (typeof this.headers[key] === 'undefined') {
			return [];
		}
		return /** @type {string[]} */ (this.headers[key]);
	}

	/**
	 * @returns {Record<string,string|string[]>}
	 */
	asMap() {
		return this.headers;
	}

	/**
	 * @returns {Record<string,string>}
	 */
	asSingleValuedMap() {
		/** @type {Record<string,string>} */
		const result = {};
		for (const key of Object.keys(this.headers)) {
			result[key] = this.get(key);
		}
		return result;
	}
}

/** @param {Record<string, string|string[]>} obj */
function lowercase_keys(obj) {
	/** @type {Record<string, string|string[]>} */
	const clone = {};

	for (const key in obj) {
		clone[key.toLowerCase()] = obj[key];
	}

	return clone;
}
