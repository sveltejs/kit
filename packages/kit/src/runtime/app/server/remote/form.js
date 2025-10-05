/** @import { RemoteFormInput, RemoteForm } from '@sveltejs/kit' */
/** @import { InternalRemoteFormIssue, MaybePromise, RemoteInfo } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { DEV } from 'esm-env';
import {
	convert_formdata,
	flatten_issues,
	create_field_proxy,
	set_nested_value,
	throw_on_old_property_access,
	deep_set
} from '../../../form-utils.svelte.js';
import { get_cache, run_remote_function } from './shared.js';

/**
 * Creates a form object that can be spread onto a `<form>` element.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#form) for full documentation.
 *
 * @template Output
 * @overload
 * @param {() => MaybePromise<Output>} fn
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
 * @param {(data: Input) => MaybePromise<Output>} fn
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
 * @param {(data: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Output>} fn
 * @returns {RemoteForm<StandardSchemaV1.InferInput<Schema>, Output>}
 * @since 2.27
 */
/**
 * @template {RemoteFormInput} Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(data?: Input) => MaybePromise<Output>} [maybe_fn]
 * @returns {RemoteForm<Input, Output>}
 * @since 2.27
 */
/*@__NO_SIDE_EFFECTS__*/
// @ts-ignore we don't want to prefix `fn` with an underscore, as that will be user-visible
export function form(validate_or_fn, maybe_fn) {
	/** @type {(data?: Input) => Output} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {StandardSchemaV1 | null} */
	const schema = !maybe_fn || validate_or_fn === 'unchecked' ? null : validate_or_fn;

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
				form_data.delete('sveltekit:validate_only');

				let data = maybe_fn ? convert_formdata(form_data) : undefined;

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

				/** @type {{ input?: Record<string, any>, issues?: Record<string, InternalRemoteFormIssue[]>, result: Output }} */
				const output = {};

				const { event, state } = get_request_store();
				const validated = await schema?.['~standard'].validate(data);

				if (validate_only) {
					return validated?.issues ?? [];
				}

				if (validated?.issues !== undefined) {
					output.issues = flatten_issues(validated.issues);

					// if it was a progressively-enhanced submission, we don't need
					// to return the input — it's already there
					if (!event.isRemoteRequest) {
						output.input = {};

						for (let key of form_data.keys()) {
							// redact sensitive fields
							if (/^[.\]]?_/.test(key)) continue;

							const is_array = key.endsWith('[]');
							const values = form_data.getAll(key).filter((value) => typeof value === 'string');

							if (is_array) key = key.slice(0, -2);

							output.input = set_nested_value(
								/** @type {Record<string, any>} */ (output.input),
								key,
								is_array ? values : values[0]
							);
						}
					}
				} else {
					if (validated !== undefined) {
						data = validated.value;
					}

					state.refreshes ??= {};

					output.result = await run_remote_function(event, state, true, data, (d) => d, fn);
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
				return create_field_proxy(
					{},
					() => data?.input ?? {},
					(path, value) => {
						if (data) {
							// don't override a submission
							return;
						}

						const input = path.length === 0 ? value : deep_set({}, path.map(String), value);

						get_cache(__)[''] ??= { input };
					},
					() => data?.issues ?? {}
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
