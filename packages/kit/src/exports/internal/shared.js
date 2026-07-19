/** @import { StandardSchemaV1 } from '@standard-schema/spec' */

export class HttpError {
	/**
	 * @param {number} status
	 * @param {Omit<App.Error, 'status'> | string | undefined} body
	 * @param {Omit<App.Error, 'status' | 'message'>} [properties]
	 */
	constructor(status, body, properties) {
		this.status = status;
		if (typeof body === 'string') {
			this.body = { ...properties, message: body, status };
		} else if (body) {
			this.body = { ...body, status };
		} else {
			this.body = { message: `Error: ${status}`, status };
		}
	}

	toString() {
		return JSON.stringify(this.body);
	}
}

export class Redirect extends Error {
	/**
	 * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status
	 * @param {string} location
	 */
	constructor(status, location, refresh = false) {
		try {
			new Headers({ location });
		} catch {
			throw new Error(
				`Invalid redirect location ${JSON.stringify(location)}: ` +
					'this string contains characters that cannot be used in HTTP headers'
			);
		}

		const message = `
			A redirect was thrown outside render. To navigate, catch the error and use \`goto\`:

			import { isRedirect } from '@sveltejs/kit';
			import { goto } from '$app/navigation';

			try {
				...
			} catch (e) {
				if (isRedirect(e)) {
					goto(e.location);
				} else {
					throw e;
				}
			}
		`;

		super(message.replace(/^\t{3}/gm, '').trim());

		this.status = status;
		this.location = location;

		// TODO this is only needed for `form`, so that we add `refreshAll: true` to
		// the `goto` call in the `catch` clause. ideally it wouldn't be exposed
		this.refresh = refresh;
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
