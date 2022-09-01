export class HttpError {
	// without these, things like `$page.error.stack` will error. we don't want to
	// include a stack for these sorts of errors, but we also don't want red
	// squigglies everywhere, so this feels like a not-terribile compromise
	name = 'HttpError';

	/** @type {void} */
	stack = undefined;

	/**
	 * @param {number} status
	 * @param {string | undefined} message
	 */
	constructor(status, message) {
		this.status = status;
		this.message = message ?? `Error: ${status}`;
	}

	toString() {
		return this.message;
	}
}

export class Redirect {
	/**
	 * @param {number} status
	 * @param {string} location
	 */
	constructor(status, location) {
		this.status = status;
		this.location = location;
	}
}

export class ValidationError {
	/**
	 * @param {number} status
	 * @param {FormData | Record<string, string | string[]> | null | undefined} values
	 * @param {Record<string, any>} errors
	 */
	constructor(status, values, errors) {
		if (values instanceof FormData) {
			/** @type {Record<string, string | string[]>} */
			const converted = {};
			for (const [key, value] of values.entries()) {
				if (typeof value === 'string') {
					if (converted[key] !== undefined) {
						const array = /** @type {string[]} */ (
							Array.isArray(converted[key]) ? converted[key] : [converted[key]]
						);
						array.push(value);
						converted[key] = array;
					} else {
						converted[key] = value;
					}
				}
			}
			this.values = converted;
		} else {
			this.values = values;
		}

		this.status = status;
		this.errors = errors;
	}
}
