/**
 * Mock version of the internal remote module for component testing.
 *
 * Provides query(), command(), form(), prerender() factories that create
 * simplified reactive objects backed by the mock registry. These objects
 * implement the same interface components expect (.current, .loading,
 * .ready, .error, Promise protocol) but resolve from mockRemote() data
 * instead of making HTTP requests.
 */
import { tick } from 'svelte';
import { getMock, getOrCreateMock } from '../mock-registry.js';
import { HttpError } from '@sveltejs/kit/internal';

/**
 * @param {string} id
 */
export function query(id) {
	/** @param {any} [arg] */
	function factory(arg) {
		return new MockQueryProxy(id, arg);
	}
	factory.__mock_id = id;
	return factory;
}

// query.batch uses the same interface as query for component consumers
query.batch = query;

/**
 * @param {string} id
 */
export function command(id) {
	let pending_count = $state(0);

	/** @param {any} [arg] */
	async function cmd(arg) {
		pending_count++;
		try {
			await tick();
			const mock = getMock(id);
			if (!mock) {
				throw new Error(
					`No mock registered for command "${id}". Call mockRemote(fn).returns(data).`
				);
			}
			if (mock.delay) await new Promise((r) => setTimeout(r, mock.delay));
			if (mock.error) throw new HttpError(mock.error.status, mock.error.body);
			if (mock.resolver) return await mock.resolver(arg);
			return mock.data;
		} finally {
			pending_count--;
		}
	}

	Object.defineProperty(cmd, 'pending', { get: () => pending_count });
	cmd.__mock_id = id;

	// stub .updates() — in production this refreshes queries after a command
	const original = cmd;
	/** @param {any} [arg] */
	function cmd_with_updates(arg) {
		const promise = original(arg);
		/** @type {any} */ (promise).updates = (/** @type {any[]} */ ..._queries) => promise;
		return promise;
	}
	Object.defineProperty(cmd_with_updates, 'pending', { get: () => pending_count });
	cmd_with_updates.__mock_id = id;
	return cmd_with_updates;
}

/**
 * Creates a recursive proxy for form field access.
 * Supports deep nesting: form.fields.nested.deep.field.as('text')
 *
 * @param {string} id — the mock registry ID
 * @param {string[]} path — accumulated property path
 */
function create_field_proxy(id, path = []) {
	const path_key = path.join('.');

	return new Proxy(/** @type {any} */ ({}), {
		get(_target, prop) {
			// form.fields.value() — returns all field values
			if (prop === 'value' && path.length === 0) {
				return () => getMock(id)?.fieldValues ?? {};
			}

			// form.fields.allIssues() — returns all issues
			if (prop === 'allIssues' && path.length === 0) {
				return () => {
					const issues = getMock(id)?.fieldIssues;
					if (!issues) return undefined;
					return Object.entries(issues).flatMap(([field, field_issues]) =>
						field_issues.map((issue) => ({
							...issue,
							path: issue.path ?? [{ key: field }]
						}))
					);
				};
			}

			// form.fields.set({...}) — set all field values
			if (prop === 'set' && path.length === 0) {
				return (/** @type {Record<string, any>} */ values) => {
					const config = getOrCreateMock(id);
					config.fieldValues = { ...(config.fieldValues ?? {}), ...values };
				};
			}

			// field.as(type) — returns input props matching the real RemoteFormField.as() shape.
			// The real implementation conditionally includes `type` (omitted for 'text'/'select'),
			// and uses the type to determine name prefixes and value handling.
			if (prop === 'as') {
				return (/** @type {string} */ type, /** @type {any} */ value) => {
					const field_values = getMock(id)?.fieldValues ?? {};
					const field_issues = getMock(id)?.fieldIssues;
					const current_value = get_nested(field_values, path);

					/** @type {Record<string, any>} */
					const props = {
						name: path_key,
						get 'aria-invalid'() {
							return field_issues?.[path_key] ? 'true' : undefined;
						}
					};

					// Real implementation only adds type for non-text, non-select inputs
					if (type !== 'text' && type !== 'select' && type !== 'select multiple') {
						props.type = type === 'file multiple' ? 'file' : type;
					}

					Object.defineProperty(props, 'value', {
						get: () => value ?? current_value,
						set: () => {},
						enumerable: true
					});

					return props;
				};
			}

			// field.value() — returns current field value
			if (prop === 'value') {
				return () => {
					const field_values = getMock(id)?.fieldValues ?? {};
					return get_nested(field_values, path);
				};
			}

			// field.set(value) — updates field value
			if (prop === 'set') {
				return (/** @type {any} */ value) => {
					const config = getOrCreateMock(id);
					config.fieldValues = config.fieldValues ?? {};
					set_nested(config.fieldValues, path, value);
				};
			}

			// field.issues() — returns validation issues for this field
			if (prop === 'issues') {
				return () => {
					const issues = getMock(id)?.fieldIssues;
					return issues?.[path_key];
				};
			}

			// Otherwise, descend into nested field: form.fields.nested.deeper
			return create_field_proxy(id, [...path, String(prop)]);
		}
	});
}

/**
 * @param {Record<string, any>} obj
 * @param {string[]} path
 * @returns {any}
 */
function get_nested(obj, path) {
	let current = obj;
	for (const key of path) {
		if (current == null) return undefined;
		current = current[key];
	}
	return current;
}

/**
 * @param {Record<string, any>} obj
 * @param {string[]} path
 * @param {any} value
 */
function set_nested(obj, path, value) {
	let current = obj;
	for (let i = 0; i < path.length - 1; i++) {
		current[path[i]] = current[path[i]] ?? {};
		current = current[path[i]];
	}
	current[path[path.length - 1]] = value;
}

/**
 * @param {string} id
 */
export function form(id) {
	const pending_count = $state(0);

	// Only method and action should be enumerable — these are what
	// {...form} spreads onto the <form> element. All other properties
	// are non-enumerable to avoid setAttribute errors in the DOM.
	const instance = {
		method: /** @type {const} */ ('POST'),
		action: `?/remote=${encodeURIComponent(id)}`
	};

	Object.defineProperties(instance, {
		enhance: {
			value: () => ({ method: 'POST', action: instance.action }),
			enumerable: false
		},
		for: {
			value: (/** @type {any} */ key) => {
				const keyed = form(`${id}/${encodeURIComponent(JSON.stringify(key))}`);
				/** @type {any} */ (keyed).__mock_id = id;
				return keyed;
			},
			enumerable: false
		},
		preflight: {
			value: () => instance,
			enumerable: false
		},
		validate: {
			value: async () => {},
			enumerable: false
		},
		result: {
			get() {
				return getMock(id)?.data;
			},
			enumerable: false
		},
		pending: {
			get() {
				return pending_count;
			},
			enumerable: false
		},
		fields: {
			value: create_field_proxy(id),
			enumerable: false
		},
		__mock_id: {
			value: id,
			enumerable: false
		}
	});

	return instance;
}

/**
 * @param {string} id
 */
export function prerender(id) {
	// prerender behaves like query for component consumers
	return query(id);
}

class MockQueryProxy {
	#id;
	#arg;
	#loading = $state(true);
	#ready = $state(false);
	/** @type {any} */
	#current = $state.raw(undefined);
	/** @type {any} */
	#error = $state.raw(undefined);
	#promise;

	/**
	 * @param {string} id
	 * @param {any} arg
	 */
	constructor(id, arg) {
		this.#id = id;
		this.#arg = arg;
		this._key = id;
		this.#promise = this.#resolve();
	}

	async #resolve() {
		const mock = getMock(this.#id);
		if (!mock) {
			const err = new Error(
				`No mock registered for query "${this.#id}". Call mockRemote(fn).returns(data).`
			);
			this.#error = err;
			this.#loading = false;
			throw err;
		}

		if (mock.delay) {
			await new Promise((r) => setTimeout(r, mock.delay));
		} else {
			await tick();
		}

		if (mock.error) {
			const err = new HttpError(mock.error.status, mock.error.body);
			this.#error = err;
			this.#loading = false;
			throw err;
		}

		const data = mock.resolver ? await mock.resolver(this.#arg) : mock.data;
		this.#current = data;
		this.#ready = true;
		this.#loading = false;
		return data;
	}

	get current() {
		return this.#current;
	}

	get loading() {
		return this.#loading;
	}

	get ready() {
		return this.#ready;
	}

	get error() {
		return this.#error;
	}

	/** @type {Promise<any>['then']} */
	then(onfulfilled, onrejected) {
		return this.#promise.then(onfulfilled, onrejected);
	}

	/** @type {Promise<any>['catch']} */
	catch(onrejected) {
		return this.#promise.catch(onrejected);
	}

	/** @type {Promise<any>['finally']} */
	finally(onfinally) {
		return this.#promise.finally(onfinally);
	}

	run() {
		return this.#promise;
	}

	refresh() {
		this.#loading = true;
		this.#promise = this.#resolve();
		return this.#promise.then(() => {});
	}

	/** @param {any} value */
	set(value) {
		this.#current = value;
		this.#ready = true;
		this.#loading = false;
	}

	/** @param {(current: any) => any} _update */
	withOverride(_update) {
		return { _key: this._key, release: () => {} };
	}

	get [Symbol.toStringTag]() {
		return 'MockQueryProxy';
	}
}
