export class HttpError {
	/**
	 * @param {number} status
	 * @param {{message: string} extends App.Error ? (App.Error | string | undefined) : App.Error} body
	 */
	constructor(status, body) {
		this.status = status;
		if (typeof body === 'string') {
			this.body = { message: body };
		} else if (body) {
			this.body = body;
		} else {
			this.body = { message: `Error: ${status}` };
		}
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
		this.status = status;
		this.location = location;
	}
}

/**
 * @template {Record<string, unknown> | undefined} [T=undefined]
 */
export class ActionFailure {
	/**
	 * @param {number} status
	 * @param {T} [data]
	 */
	constructor(status, data) {
		this.status = status;
		this.data = data;
	}
}

/**
 * This is a grotesque hack that, in dev, allows us to replace the implementations
 * of these classes that you'd get by importing them from `@sveltejs/kit` with the
 * ones that are imported via Vite and loaded internally, so that instanceof
 * checks work even though SvelteKit imports this module via Vite and consumers
 * import it via Node
 * @param {{
 *   ActionFailure: typeof ActionFailure;
 *   HttpError: typeof HttpError;
 *   Redirect: typeof Redirect;
 * }} implementations
 */
export function replace_implementations(implementations) {
	// @ts-expect-error
	ActionFailure = implementations.ActionFailure; // eslint-disable-line no-class-assign
	// @ts-expect-error
	HttpError = implementations.HttpError; // eslint-disable-line no-class-assign
	// @ts-expect-error
	Redirect = implementations.Redirect; // eslint-disable-line no-class-assign
}
