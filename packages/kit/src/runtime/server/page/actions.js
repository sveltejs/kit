import { error, json } from '../../../exports/index.js';
import { negotiate } from '../../../utils/http.js';
import { HttpError, Redirect, ValidationError } from '../../control.js';
import { error_to_pojo } from '../utils.js';

/**
 * @param {import('types').RequestEvent} event
 */
export function is_action_json_request(event) {
	const accept = negotiate(event.request.headers.get('accept') || 'text/html', [
		'text/html',
		'application/json'
	]);

	return (
		accept === 'application/json' &&
		event.request.method !== 'GET' &&
		event.request.method !== 'HEAD'
	);
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRNode['server']} server
 */
export async function handle_action_json_request(event, options, server) {
	const actions = server.actions;

	if (!actions) {
		maybe_throw_migration_error(server);
		// TODO should this be a different error altogether?
		return new Response('POST method not allowed. No actions exist for this page', {
			status: 405,
			headers: {
				// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
				// "The server must generate an Allow header field in a 405 status code response"
				allow: ''
			}
		});
	}

	try {
		const result = await call_action(event, options, actions);
		if (!result) {
			// TODO json({status: 204}) instead?
			return new Response(undefined, {
				status: 204
			});
		} else {
			return json(/** @type {import('types').FormFetchResponse} */ ({ status: 200, result }));
		}
	} catch (e) {
		const error = /** @type {Redirect | HttpError | ValidationError | Error} */ (e);

		if (error instanceof Redirect) {
			return json(
				/** @type {import('types').FormFetchResponse} */ ({
					status: error.status,
					location: error.location
				})
			);
		}

		if (error instanceof ValidationError) {
			return json(
				/** @type {import('types').FormFetchResponse} */ ({
					status: error.status,
					values: error.values,
					errors: error.errors
				}),
				{ status: error.status }
			);
		}

		if (!(error instanceof HttpError)) {
			options.handle_error(error, event);
		}

		return json(error_to_pojo(error, options.get_stack), {
			status: error instanceof HttpError ? error.status : 500
		});
	}
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRNode} leaf_node
 * @returns
 */
export function is_action_request(event, leaf_node) {
	return leaf_node.server && event.request.method !== 'GET' && event.request.method !== 'HEAD';
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRNode['server']} server
 * @returns {Promise<Record<string,any> | void>}
 * @throws {Redirect | ValidationError | HttpError | Error}
 */
export async function handle_action_request(event, options, server) {
	const actions = server.actions;

	if (!actions) {
		maybe_throw_migration_error(server);
		// TODO should this be a different error altogether?
		event.setHeaders({
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
			// "The server must generate an Allow header field in a 405 status code response"
			allow: ''
		});
		throw error(405, 'POST method not allowed. No actions exist for this page');
	}

	return call_action(event, options, actions);
}

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {NonNullable<import('types').SSRNode['server']['actions']>} actions
 * @throws {Redirect | ValidationError | HttpError | Error}
 */
export async function call_action(event, options, actions) {
	const url = new URL(event.request.url);

	let name = 'default';
	for (const param of url.searchParams) {
		if (param[0].startsWith('/')) {
			name = param[0].slice(1);
			break;
		}
	}

	const action = actions[name];
	if (!action) {
		throw new Error(`No action with name '${name}' found`);
	}

	if (event.request.headers.get('content-type') === 'application/json') {
		throw new Error('Actions expect form-encoded data, JSON is not supported');
	}

	const form = await event.request.formData();
	const fields = new FormData();
	const files = new FilesFormData();
	const promises = [];

	for (const [key, value] of form) {
		if (typeof value === 'string') {
			fields.append(key, value);
		} else {
			promises.push(
				Promise.resolve()
					.then(() => options.hooks.handleFile({ event, field: key, file: value }))
					.then((/** @type {any} */ value) => ({ key, value }))
			);
		}
	}

	(await Promise.all(promises)).map(({ key, value }) => files.append(key, value));

	return action({
		...event,
		fields: /** @type {import('types').FieldsFormData} */ (fields),
		files
	});
}

/**
 * @param {import('types').SSRNode['server']} server
 */
function maybe_throw_migration_error(server) {
	for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
		if (/** @type {any} */ (server)[method]) {
			throw new Error(
				`${method} method no longer allowed in +page.server, use actions instead. See the PR for more info: https://github.com/sveltejs/kit/pull/6469`
			);
		}
	}
}

/**
 * (written like this because JSDoc doesn't support import syntax in `@implements`)
 * @typedef {import('types').FilesFormData}  FFD
 */

/** @implements {FFD} */
export class FilesFormData {
	constructor() {
		/** @type {Map<string, any[]>} */
		this.map = new Map();
	}
	/**
	 * @param {string} key
	 * @param {any} file
	 */
	set(key, file) {
		this.map.set(key, [file]);
	}
	/**
	 * @param {string} key
	 */
	get(key) {
		return this.map.get(key)?.[0];
	}
	/**
	 * @param {string} key
	 * @param {any} file
	 */
	append(key, file) {
		const files = this.map.get(key) || [];
		files.push(file);
		this.map.set(key, files);
	}
	/**
	 * @param {string} key
	 */
	delete(key) {
		this.map.delete(key);
	}
	/**
	 * @param {string} key
	 */
	has(key) {
		return this.map.has(key);
	}
	/**
	 * @param {string} key
	 */
	getAll(key) {
		return this.map.get(key) || [];
	}
	/**
	 * @param {Parameters<FFD['forEach']>[0]} callback
	 */
	forEach(callback) {
		this.map.forEach((values, key) => values.forEach((value) => callback(value, key, this)));
	}
	entries() {
		return new Iterator(this.map, true, true);
	}
	keys() {
		return new Iterator(this.map, true, false);
	}
	values() {
		return new Iterator(this.map, false, true);
	}

	[Symbol.iterator]() {
		return new Iterator(this.map, true, true);
	}
}

/** @implements {IterableIterator<any>} */
class Iterator {
	/**
	 * @param {Map<string, any[]>} map
	 * @param {boolean} key
	 * @param {boolean} value
	 * */
	constructor(map, key, value) {
		this.key = key;
		this.value = value;
		this.map = map;
		this.entries = this.map.entries();
		this.index = 0;
		this.current = undefined;
	}
	next() {
		this.current = this.current || this.entries.next();
		if (this.current.done) {
			return { value: undefined, done: true };
		}

		const value =
			this.key && this.value
				? [this.current.value[0], this.current.value[1][this.index]]
				: this.key
				? this.current.value[0]
				: this.current.value[1][this.index];
		const next = { value, done: false };

		this.index++;
		if (this.index >= this.current.length) {
			this.index = 0;
			this.current = undefined;
		}

		return next;
	}
	[Symbol.iterator]() {
		return this;
	}
}
