export class HttpError {
	/**
	 * @param {number} status
	 * @param {string} message
	 */
	constructor(status, message) {
		this.status = status;
		this.message = message || `Error: ${status}`;
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
