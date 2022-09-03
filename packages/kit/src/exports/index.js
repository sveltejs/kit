import { HttpError, Redirect, ValidationError } from '../runtime/control.js';

/**
 * Creates an `HttpError` object with an HTTP status code and an optional message.
 * This object, if thrown during request handling, will cause SvelteKit to
 * return an error response without invoking `handleError`
 * @param {number} status
 * @param {string | undefined} [message]
 */
export function error(status, message) {
	return new HttpError(status, message);
}

/**
 * Creates a `Redirect` object. If thrown during request handling, SvelteKit will
 * return a redirect response.
 * @param {number} status
 * @param {string} location
 */
export function redirect(status, location) {
	if (isNaN(status) || status < 300 || status > 399) {
		throw new Error('Invalid status code');
	}

	return new Redirect(status, location);
}

/**
 * Generates a JSON `Response` object from the supplied data.
 * @param {any} data
 * @param {ResponseInit} [init]
 */
export function json(data, init) {
	// TODO deprecate this in favour of `Response.json` when it's
	// more widely supported
	const headers = new Headers(init?.headers);
	if (!headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}

	return new Response(JSON.stringify(data), {
		...init,
		headers
	});
}

/**
 * Generates a `ValidationError` object.
 * @param {number} status
 * @param {Record<string, any> | undefined} [data]
 */
export function invalid(status, data) {
	return new ValidationError(status, data);
}

/** @type {import('types').enhance} */
export function enhance(form, { pending, error, invalid, redirect, result } = {}) {
	/** @type {unknown} */
	let current_token;

	/** @param {SubmitEvent} event */
	async function handle_submit(event) {
		const token = (current_token = {});

		event.preventDefault();

		const data = new FormData(form);

		if (pending) pending({ data, form });

		try {
			const response = await fetch(form.action, {
				method: 'POST',
				headers: {
					accept: 'application/json'
				},
				body: data
			});

			if (token !== current_token) return;

			if (response.ok) {
				/** @type {import('types').FormFetchResponse} */
				const json = await response.json();
				if (json.type === 'success' && result) {
					result({ data, form, response: /** @type {any} */ (json.data) });
				} else if (json.type === 'invalid' && invalid) {
					invalid({ data, form, response: /** @type {any} */ (json.data) });
				} else if (json.type === 'redirect' && redirect) {
					redirect({ data, form, location: json.location });
				}
			} else if (error) {
				error({ data, form, error: null, response });
			} else {
				console.error(await response.text());
			}
		} catch (err) {
			if (error && err instanceof Error) {
				error({ data, form, error: err, response: null });
			} else {
				throw err;
			}
		}
	}

	form.addEventListener('submit', handle_submit);

	return {
		destroy() {
			form.removeEventListener('submit', handle_submit);
		}
	};
}
