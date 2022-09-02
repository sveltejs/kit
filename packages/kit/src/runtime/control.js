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

/**
 * @template {Record<string, unknown> | undefined} [T=undefined]
 */
export class ValidationError {
	/**
	 * @param {number} status
	 * @param {T} [data]
	 */
	constructor(status, data) {
		this.status = status;
		this.data = data;
	}
}
