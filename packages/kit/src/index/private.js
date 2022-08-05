export class HttpError {
	/**
	 * @param {number} status
	 * @param {string} message
	 */
	constructor(status, message) {
		this.status = status;
		this.message = message || `Error: ${status}`;

		// this is a hack to workaround failed instanceof checks
		// TODO figure out a better way to do this
		this.__is_http_error = true;
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

		// this is a hack to workaround failed instanceof checks
		// TODO figure out a better way to do this
		this.__is_redirect = true;
	}
}
