/** @import { StandardSchemaV1 } from '@standard-schema/spec' */

export class HttpError {
	/**
	 * @param {App.Error} error
	 */
	constructor(error) {
		this.status = error.status;
		this.body = error;
	}

	toString() {
		return JSON.stringify(this.body);
	}
}

export class Redirect {
	/**
	 * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status
	 * @param {string} location
	 */
	constructor(status, location) {
		try {
			new Headers({ location });
		} catch {
			throw new Error(
				`Invalid redirect location ${JSON.stringify(location)}: ` +
					'this string contains characters that cannot be used in HTTP headers'
			);
		}

		this.status = status;
		this.location = location;
	}
}

/**
 * An error that was thrown from within the SvelteKit runtime that is not fatal and doesn't result in a 500, such as a 404.
 * `SvelteKitError` goes through `handleError`.
 * @extends Error
 */
export class SvelteKitError extends Error {
	/**
	 * @param {number} status
	 * @param {string} text
	 * @param {string} message
	 */
	constructor(status, text, message) {
		super(message);
		this.status = status;
		this.text = text;
	}
}

/**
 * @template [T=undefined]
 */
export class ActionFailure {
	/**
	 * @param {number} status
	 * @param {T} data
	 */
	constructor(status, data) {
		this.status = status;
		this.data = data;
	}
}

/**
 * Error thrown when form validation fails imperatively
 */
export class ValidationError extends Error {
	/**
	 * @param {StandardSchemaV1.Issue[]} issues
	 */
	constructor(issues) {
		super('Validation failed');
		this.name = 'ValidationError';
		this.issues = issues;
	}
}
