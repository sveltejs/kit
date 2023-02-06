export let HttpError = class HttpError {
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
};

export let Redirect = class Redirect {
	/**
	 * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status
	 * @param {string} location
	 */
	constructor(status, location) {
		this.status = status;
		this.location = location;
	}
};

/**
 * @template {Record<string, unknown> | undefined} [T=undefined]
 */
export let ActionFailure = class ActionFailure {
	/**
	 * @param {number} status
	 * @param {T} [data]
	 */
	constructor(status, data) {
		this.status = status;
		this.data = data;
	}
};

/**
 * @template {Record<string, unknown>} T
 */
export let Deferred = class Deferred {
	/**
	 * @param {T} data
	 */
	constructor(data) {
		this.data = data;
	}
};

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
 *   Deferred: typeof Deferred;
 * }} implementations
 */
export function replace_implementations(implementations) {
	ActionFailure = implementations.ActionFailure;
	HttpError = implementations.HttpError;
	Redirect = implementations.Redirect;
	Deferred = implementations.Deferred;
}
