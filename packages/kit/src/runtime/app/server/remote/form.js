/** @import { RemoteFormInput, RemoteForm } from '@sveltejs/kit' */
/** @import { InternalRemoteFormIssue, MaybePromise, RemoteInfo } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { DEV } from 'esm-env';
import {
	convert_formdata,
	create_field_proxy,
	set_nested_value,
	throw_on_old_property_access,
	deep_set,
	normalize_issue,
	flatten_issues
} from '../../../form-utils.js';
import { get_cache, run_remote_function } from './shared.js';

/**
 * Creates a form object that can be spread onto a `<form>` element.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
 *
 * @template Output
 * @overload
 * @param {(invalid: import('@sveltejs/kit').Invalid<void>) => MaybePromise<Output>} fn
 * @returns {RemoteForm<void, Output>}
 * @since 2.27
 */
/**
 * Creates a form object that can be spread onto a `<form>` element.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
 *
 * @template {RemoteFormInput} Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(data: Input, invalid: import('@sveltejs/kit').Invalid<Input>) => MaybePromise<Output>} fn
 * @returns {RemoteForm<Input, Output>}
 * @since 2.27
 */
/**
 * Creates a form object that can be spread onto a `<form>` element.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
 *
 * @template {StandardSchemaV1<RemoteFormInput, Record<string, any>>} Schema
 * @template Output
 * @overload
 * @param {Schema} validate
 * @param {(data: StandardSchemaV1.InferOutput<Schema>, invalid: import('@sveltejs/kit').Invalid<StandardSchemaV1.InferInput<Schema>>) => MaybePromise<Output>} fn
 * @returns {RemoteForm<StandardSchemaV1.InferInput<Schema>, Output>}
 * @since 2.27
 */
/**
 * @template {RemoteFormInput} Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(data_or_invalid: any, invalid?: any) => MaybePromise<Output>} [maybe_fn]
 * @returns {RemoteForm<Input, Output>}
 * @since 2.27
 */
/*@__NO_SIDE_EFFECTS__*/
// @ts-ignore we don't want to prefix `fn` with an underscore, as that will be user-visible
export function form(validate_or_fn, maybe_fn) {
	/** @type {any} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {StandardSchemaV1 | null} */
	const schema =
		!maybe_fn || validate_or_fn === 'unchecked' ? null : /** @type {any} */ (validate_or_fn);

	/**
	 * @param {string | number | boolean} [key]
	 */
	function create_instance(key) {
		/** @type {RemoteForm<Input, Output>} */
		const instance = {};

		instance.method = 'POST';

		Object.defineProperty(instance, 'enhance', {
			value: () => {
				return { action: instance.action, method: instance.method };
			}
		});

		const button_props = {
			type: 'submit',
			onclick: () => {}
		};

		Object.defineProperty(button_props, 'enhance', {
			value: () => {
				return { type: 'submit', formaction: instance.buttonProps.formaction, onclick: () => {} };
			}
		});

		Object.defineProperty(instance, 'buttonProps', {
			value: button_props
		});

		/** @type {RemoteInfo} */
		const __ = {
			type: 'form',
			name: '',
			id: '',
			/** @param {FormData} form_data */
			fn: async (form_data) => {
				const validate_only = form_data.get('sveltekit:validate_only') === 'true';

				let data = maybe_fn ? convert_formdata(form_data) : undefined;

				if (data && data.id === undefined) {
					const id = form_data.get('sveltekit:id');
					if (typeof id === 'string') {
						data.id = JSON.parse(id);
					}
				}

				// TODO 3.0 remove this warning
				if (DEV && !data) {
					const error = () => {
						throw new Error(
							'Remote form functions no longer get passed a FormData object. ' +
								"`form` now has the same signature as `query` or `command`, i.e. it expects to be invoked like `form(schema, callback)` or `form('unchecked', callback)`. " +
								'The payload of the callback function is now a POJO instead of a FormData object. See https://kit.svelte.dev/docs/remote-functions#form for details.'
						);
					};
					data = {};
					for (const key of [
						'append',
						'delete',
						'entries',
						'forEach',
						'get',
						'getAll',
						'has',
						'keys',
						'set',
						'values'
					]) {
						Object.defineProperty(data, key, { get: error });
					}
				}

				/** @type {{ submission: true, input?: Record<string, any>, issues?: InternalRemoteFormIssue[], result: Output }} */
				const output = {};

				// make it possible to differentiate between user submission and programmatic `field.set(...)` updates
				output.submission = true;

				const { event, state } = get_request_store();
				const validated = await schema?.['~standard'].validate(data);

				if (validate_only) {
					return validated?.issues?.map((issue) => normalize_issue(issue, true)) ?? [];
				}

				if (validated?.issues !== undefined) {
					handle_issues(output, validated.issues, event.isRemoteRequest, form_data);
				} else {
					if (validated !== undefined) {
						data = validated.value;
					}

					state.refreshes ??= {};

					const invalid = create_invalid();

					try {
						output.result = await run_remote_function(
							event,
							state,
							true,
							data,
							(d) => d,
							(data) => (!maybe_fn ? fn(invalid) : fn(data, invalid))
						);
					} catch (e) {
						if (e instanceof ValidationError) {
							handle_issues(output, e.issues, event.isRemoteRequest, form_data);
						} else {
							throw e;
						}
					}
				}

				// We don't need to care about args or deduplicating calls, because uneval results are only relevant in full page reloads
				// where only one form submission is active at the same time
				if (!event.isRemoteRequest) {
					get_cache(__, state)[''] ??= output;
				}

				return output;
			}
		};

		Object.defineProperty(instance, '__', { value: __ });

		Object.defineProperty(instance, 'action', {
			get: () => `?/remote=${__.id}`,
			enumerable: true
		});

		Object.defineProperty(button_props, 'formaction', {
			get: () => `?/remote=${__.id}`,
			enumerable: true
		});

		Object.defineProperty(instance, 'fields', {
			get() {
				const data = get_cache(__)?.[''];
				const issues = flatten_issues(data?.issues ?? []);

				return create_field_proxy(
					{},
					() => data?.input ?? {},
					(path, value) => {
						if (data?.submission) {
							// don't override a submission
							return;
						}

						const input =
							path.length === 0 ? value : deep_set(data?.input ?? {}, path.map(String), value);

						(get_cache(__)[''] ??= {}).input = input;
					},
					() => issues
				);
			}
		});

		// TODO 3.0 remove
		if (DEV) {
			throw_on_old_property_access(instance);
		}

		Object.defineProperty(instance, 'result', {
			get() {
				try {
					return get_cache(__)?.['']?.result;
				} catch {
					return undefined;
				}
			}
		});

		// On the server, pending is always 0
		Object.defineProperty(instance, 'pending', {
			get: () => 0
		});

		// On the server, buttonProps.pending is always 0
		Object.defineProperty(button_props, 'pending', {
			get: () => 0
		});

		Object.defineProperty(instance, 'preflight', {
			// preflight is a noop on the server
			value: () => instance
		});

		Object.defineProperty(instance, 'validate', {
			value: () => {
				throw new Error('Cannot call validate() on the server');
			}
		});

		if (key == undefined) {
			Object.defineProperty(instance, 'for', {
				/** @type {RemoteForm<any, any>['for']} */
				value: (key) => {
					const { state } = get_request_store();
					const cache_key = __.id + '|' + JSON.stringify(key);
					let instance = (state.form_instances ??= new Map()).get(cache_key);

					if (!instance) {
						instance = create_instance(key);
						instance.__.id = `${__.id}/${encodeURIComponent(JSON.stringify(key))}`;
						instance.__.name = __.name;

						state.form_instances.set(cache_key, instance);
					}

					return instance;
				}
			});
		}

		return instance;
	}

	return create_instance();
}

/**
 * @param {{ issues?: InternalRemoteFormIssue[], input?: Record<string, any>, result: any }} output
 * @param {readonly StandardSchemaV1.Issue[]} issues
 * @param {boolean} is_remote_request
 * @param {FormData} form_data
 */
function handle_issues(output, issues, is_remote_request, form_data) {
	output.issues = issues.map((issue) => normalize_issue(issue, true));

	// if it was a progressively-enhanced submission, we don't need
	// to return the input — it's already there
	if (!is_remote_request) {
		output.input = {};

		for (let key of form_data.keys()) {
			// redact sensitive fields
			if (/^[.\]]?_/.test(key)) continue;

			const is_array = key.endsWith('[]');
			const values = form_data.getAll(key).filter((value) => typeof value === 'string');

			if (is_array) key = key.slice(0, -2);

			set_nested_value(
				/** @type {Record<string, any>} */ (output.input),
				key,
				is_array ? values : values[0]
			);
		}
	}
}

/**
 * Creates an invalid function that can be used to imperatively mark form fields as invalid
 * @returns {import('@sveltejs/kit').Invalid}
 */
function create_invalid() {
	/**
	 * @param {...(string | StandardSchemaV1.Issue)} issues
	 * @returns {never}
	 */
	function invalid(...issues) {
		throw new ValidationError(
			issues.map((issue) => {
				if (typeof issue === 'string') {
					return {
						path: [],
						message: issue
					};
				}

				return issue;
			})
		);
	}

	return /** @type {import('@sveltejs/kit').Invalid} */ (
		new Proxy(invalid, {
			get(target, prop) {
				if (typeof prop === 'symbol') return /** @type {any} */ (target)[prop];

				/**
				 * @param {string} message
				 * @param {(string | number)[]} path
				 * @returns {StandardSchemaV1.Issue}
				 */
				const create_issue = (message, path = []) => ({
					message,
					path
				});

				return create_issue_proxy(prop, create_issue, []);
			}
		})
	);
}

/**
 * Error thrown when form validation fails imperatively
 */
class ValidationError extends Error {
	/**
	 * @param {StandardSchemaV1.Issue[]} issues
	 */
	constructor(issues) {
		super('Validation failed');
		this.name = 'ValidationError';
		this.issues = issues;
	}
}

/**
 * Creates a proxy that builds up a path and returns a function to create an issue
 * @param {string | number} key
 * @param {(message: string, path: (string | number)[]) => StandardSchemaV1.Issue} create_issue
 * @param {(string | number)[]} path
 */
function create_issue_proxy(key, create_issue, path) {
	const new_path = [...path, key];

	/**
	 * @param {string} message
	 * @returns {StandardSchemaV1.Issue}
	 */
	const issue_func = (message) => create_issue(message, new_path);

	return new Proxy(issue_func, {
		get(target, prop) {
			if (typeof prop === 'symbol') return /** @type {any} */ (target)[prop];

			// Handle array access like invalid.items[0]
			if (/^\d+$/.test(prop)) {
				return create_issue_proxy(parseInt(prop, 10), create_issue, new_path);
			}

			// Handle property access like invalid.field.nested
			return create_issue_proxy(prop, create_issue, new_path);
		}
	});
}
