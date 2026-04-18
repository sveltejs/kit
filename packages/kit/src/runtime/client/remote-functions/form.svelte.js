/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { RemoteFormInput, RemoteForm, RemoteQueryUpdate } from '@sveltejs/kit' */
/** @import { InternalRemoteFormIssue, RemoteFunctionResponse } from 'types' */
import { app_dir, base } from '$app/paths/internal/client';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { HttpError } from '@sveltejs/kit/internal';
import { app, query_responses, _goto, set_nearest_error_page, invalidateAll } from '../client.js';
import { tick } from 'svelte';
import { apply_refreshes, categorize_updates } from './shared.svelte.js';
import { createAttachmentKey } from 'svelte/attachments';
import {
	convert_formdata,
	flatten_issues,
	create_field_proxy,
	deep_set,
	set_nested_value,
	throw_on_old_property_access,
	build_path_string,
	normalize_issue,
	serialize_binary_form,
	BINARY_FORM_CONTENT_TYPE
} from '../../form-utils.js';

/**
 * Merge client issues into server issues. Server issues are persisted unless
 * a client-issue exists for the same path, in which case the client-issue overrides it.
 * @param {FormData} form_data
 * @param {InternalRemoteFormIssue[]} current_issues
 * @param {InternalRemoteFormIssue[]} client_issues
 * @returns {InternalRemoteFormIssue[]}
 */
function merge_with_server_issues(form_data, current_issues, client_issues) {
	const merged = [
		...current_issues.filter(
			(issue) => issue.server && !client_issues.some((i) => i.name === issue.name)
		),
		...client_issues
	];

	const keys = Array.from(form_data.keys());

	return merged.sort((a, b) => keys.indexOf(a.name) - keys.indexOf(b.name));
}

/**
 * Client-version of the `form` function from `$app/server`.
 * @template {RemoteFormInput} T
 * @template U
 * @param {string} id
 * @returns {RemoteForm<T, U>}
 */
export function form(id) {
	/** @type {Map<any, { count: number, instance: RemoteForm<T, U> }>} */
	const instances = new Map();

	/** @param {string | number | boolean} [key] */
	function create_instance(key) {
		const action_id_without_key = id;
		const action_id = id + (key != undefined ? `/${JSON.stringify(key)}` : '');
		const action = '?/remote=' + encodeURIComponent(action_id);

		/**
		 * @type {Record<string, string | string[] | File | File[]>}
		 */
		let input = $state({});

		/** @type {InternalRemoteFormIssue[]} */
		let raw_issues = $state.raw([]);

		const issues = $derived(flatten_issues(raw_issues));

		/** @type {any} */
		let result = $state.raw(query_responses[action_id]);

		/** @type {number} */
		let pending_count = $state(0);

		/** @type {StandardSchemaV1 | undefined} */
		let preflight_schema = undefined;

		/** @type {HTMLFormElement | null} */
		let element = null;

		/** @type {Record<string, boolean>} */
		let touched = {};

		let submitted = false;

		/**
		 * @param {FormData} form_data
		 * @returns {Record<string, any>}
		 */
		function convert(form_data) {
			const data = convert_formdata(form_data);
			if (key !== undefined && !form_data.has('id')) {
				data.id = key;
			}
			return data;
		}

		/**
		 * @param {HTMLFormElement} form
		 * @param {FormData} form_data
		 * @param {Parameters<RemoteForm<any, any>['enhance']>[0]} callback
		 */
		async function handle_submit(form, form_data, callback) {
			const data = convert(form_data);

			submitted = true;

			// Increment pending count immediately so that `pending` reflects
			// the in-progress state during async preflight validation
			pending_count++;

			const validated = await preflight_schema?.['~standard'].validate(data);

			if (validated?.issues) {
				raw_issues = merge_with_server_issues(
					form_data,
					raw_issues,
					validated.issues.map((issue) => normalize_issue(issue, false))
				);
				pending_count--;
				return;
			}

			// Preflight passed - clear stale client-side preflight issues
			if (preflight_schema) {
				raw_issues = raw_issues.filter((issue) => issue.server);
			}

			// TODO 3.0 remove this warning
			if (DEV) {
				const error = () => {
					throw new Error(
						'Remote form functions no longer get passed a FormData object. The payload is now a POJO. See https://kit.svelte.dev/docs/remote-functions#form for details.'
					);
				};
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
					if (!(key in data)) {
						Object.defineProperty(data, key, { get: error });
					}
				}
			}

			try {
				// eslint-disable-next-line @typescript-eslint/await-thenable -- `callback` is typed as returning `void` to allow returning e.g. `Promise<boolean>`
				await callback({
					form,
					data,
					submit: () => submit(form_data)
				});
			} catch (e) {
				const error = e instanceof HttpError ? e.body : { message: /** @type {any} */ (e).message };
				const status = e instanceof HttpError ? e.status : 500;
				void set_nearest_error_page(error, status);
			} finally {
				pending_count--;
			}
		}

		/**
		 * @param {FormData} data
		 * @returns {Promise<boolean> & { updates: (...args: any[]) => Promise<boolean> }}
		 */
		function submit(data) {
			// Store a reference to the current instance and increment the usage count for the duration
			// of the request. This ensures that the instance is not deleted in case of an optimistic update
			// (e.g. when deleting an item in a list) that fails and wants to surface an error to the user afterwards.
			// If the instance would be deleted in the meantime, the error property would be assigned to the old,
			// no-longer-visible instance, so it would never be shown to the user.
			const entry = instances.get(key);
			if (entry) {
				entry.count++;
			}

			let overrides = /** @type {Array<() => void> | null} */ (null);

			/** @type {Set<string> | null} */
			let refreshes = null;

			/** @type {Error | undefined} */
			let updates_error;

			/** @type {Promise<boolean> & { updates: (...args: RemoteQueryUpdate[]) => Promise<boolean> }} */
			const promise = (async () => {
				try {
					await Promise.resolve();

					if (updates_error) {
						throw updates_error;
					}

					const { blob } = serialize_binary_form(convert(data), {
						remote_refreshes: Array.from(refreshes ?? [])
					});

					const response = await fetch(`${base}/${app_dir}/remote/${action_id_without_key}`, {
						method: 'POST',
						headers: {
							'Content-Type': BINARY_FORM_CONTENT_TYPE,
							// Forms cannot be called during rendering, so it's save to use location here
							'x-sveltekit-pathname': location.pathname,
							'x-sveltekit-search': location.search
						},
						body: blob
					});

					if (!response.ok) {
						// We only end up here in case of a network error or if the server has an internal error
						// (which shouldn't happen because we handle errors on the server and always send a 200 response)
						throw new Error('Failed to execute remote function');
					}

					const form_result = /** @type { RemoteFunctionResponse} */ (await response.json());

					// reset issues in case it's a redirect or error (but issues passed in that case)
					raw_issues = [];
					result = undefined;

					if (form_result.type === 'result') {
						({ issues: raw_issues = [], result } = devalue.parse(form_result.result, app.decoders));
						const succeeded = raw_issues.length === 0;

						if (succeeded) {
							if (form_result.refreshes) {
								apply_refreshes(form_result.refreshes);
							} else {
								void invalidateAll();
							}
						}

						return succeeded;
					} else if (form_result.type === 'redirect') {
						const stringified_refreshes = form_result.refreshes ?? '';
						if (stringified_refreshes) {
							apply_refreshes(stringified_refreshes);
						}
						// Use internal version to allow redirects to external URLs
						void _goto(form_result.location, { invalidateAll: !stringified_refreshes }, 0);
						return true;
					} else {
						throw new HttpError(form_result.status ?? 500, form_result.error);
					}
				} catch (e) {
					result = undefined;
					throw e;
				} finally {
					overrides?.forEach((fn) => fn());

					void tick().then(() => {
						if (entry) {
							entry.count--;
							if (entry.count === 0) {
								instances.delete(key);
							}
						}
					});
				}
			})();

			let updates_called = false;
			promise.updates = (...args) => {
				if (updates_called) {
					console.warn(
						'Updates can only be sent once per form submission. Ignoring additional updates.'
					);
					return promise;
				}
				updates_called = true;

				try {
					({ refreshes, overrides } = categorize_updates(args));
				} catch (error) {
					updates_error = /** @type {Error} */ (error);
				}

				return promise;
			};

			return promise;
		}

		/** @type {RemoteForm<T, U>} */
		const instance = {};

		instance.method = 'POST';
		instance.action = action;

		/** @param {Parameters<RemoteForm<any, any>['enhance']>[0]} callback */
		const form_onsubmit = (callback) => {
			/** @param {SubmitEvent} event */
			return async (event) => {
				const form = /** @type {HTMLFormElement} */ (event.target);
				const method = event.submitter?.hasAttribute('formmethod')
					? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formMethod
					: clone(form).method;

				if (method !== 'post') return;

				const action = new URL(
					// We can't do submitter.formAction directly because that property is always set
					event.submitter?.hasAttribute('formaction')
						? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formAction
						: clone(form).action
				);

				if (action.searchParams.get('/remote') !== action_id) {
					return;
				}

				const target = event.submitter?.hasAttribute('formtarget')
					? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formTarget
					: clone(form).target;

				if (target === '_blank') {
					return;
				}

				event.preventDefault();

				const form_data = new FormData(form, event.submitter);

				if (DEV) {
					validate_form_data(form_data, clone(form).enctype);
				}

				await handle_submit(form, form_data, callback);
			};
		};

		/** @param {(event: SubmitEvent) => void} onsubmit */
		function create_attachment(onsubmit) {
			return (/** @type {HTMLFormElement} */ form) => {
				if (element) {
					let message = `A form object can only be attached to a single \`<form>\` element`;
					if (DEV && !key) {
						const name = id.split('/').pop();
						message += `. To create multiple instances, use \`${name}.for(key)\``;
					}

					throw new Error(message);
				}

				element = form;

				touched = {};

				form.addEventListener('submit', onsubmit);

				/** @param {Event} e */
				const handle_input = (e) => {
					// strictly speaking it can be an HTMLTextAreaElement or HTMLSelectElement
					// but that makes the types unnecessarily awkward
					const element = /** @type {HTMLInputElement} */ (e.target);

					let name = element.name;
					if (!name) return;

					const is_array = name.endsWith('[]');
					if (is_array) name = name.slice(0, -2);

					const is_file = element.type === 'file';

					touched[name] = true;

					if (is_array) {
						let value;

						if (element.tagName === 'SELECT') {
							value = Array.from(
								element.querySelectorAll('option:checked'),
								(e) => /** @type {HTMLOptionElement} */ (e).value
							);
						} else {
							const elements = /** @type {HTMLInputElement[]} */ (
								Array.from(form.querySelectorAll(`[name="${name}[]"]`))
							);

							if (DEV) {
								for (const e of elements) {
									if ((e.type === 'file') !== is_file) {
										throw new Error(
											`Cannot mix and match file and non-file inputs under the same name ("${element.name}")`
										);
									}
								}
							}

							value = is_file
								? elements.map((input) => Array.from(input.files ?? [])).flat()
								: elements.map((element) => element.value);
							if (element.type === 'checkbox') {
								value = /** @type {string[]} */ (value.filter((_, i) => elements[i].checked));
							}
						}

						set_nested_value(input, name, value);
					} else if (is_file) {
						if (DEV && element.multiple) {
							throw new Error(
								`Can only use the \`multiple\` attribute when \`name\` includes a \`[]\` suffix — consider changing "${name}" to "${name}[]"`
							);
						}

						const file = /** @type {HTMLInputElement & { files: FileList }} */ (element).files[0];

						if (file) {
							set_nested_value(input, name, file);
						} else {
							// Remove the property by setting to undefined and clean up
							const path_parts = name.split(/\.|\[|\]/).filter(Boolean);
							let current = /** @type {any} */ (input);
							for (let i = 0; i < path_parts.length - 1; i++) {
								if (current[path_parts[i]] == null) return;
								current = current[path_parts[i]];
							}
							delete current[path_parts[path_parts.length - 1]];
						}
					} else {
						set_nested_value(
							input,
							name,
							element.type === 'checkbox' && !element.checked ? null : element.value
						);
					}

					name = name.replace(/^[nb]:/, '');

					touched[name] = true;
				};

				form.addEventListener('input', handle_input);

				const handle_reset = async () => {
					// need to wait a moment, because the `reset` event occurs before
					// the inputs are actually updated (so that it can be cancelled)
					await tick();

					input = convert_formdata(new FormData(form));
				};

				form.addEventListener('reset', handle_reset);

				return () => {
					form.removeEventListener('submit', onsubmit);
					form.removeEventListener('input', handle_input);
					form.removeEventListener('reset', handle_reset);
					element = null;
					preflight_schema = undefined;
				};
			};
		}

		instance[createAttachmentKey()] = create_attachment(
			form_onsubmit(({ submit, form }) =>
				submit().then((succeeded) => {
					if (succeeded) {
						form.reset();
					}
				})
			)
		);

		let validate_id = 0;

		// TODO 3.0 remove
		if (DEV) {
			throw_on_old_property_access(instance);

			Object.defineProperty(instance, 'buttonProps', {
				get() {
					throw new Error(
						'`form.buttonProps` has been removed: Instead of `<button {...form.buttonProps}>, use `<button {...form.fields.action.as("submit", "value")}>`.' +
							' See the PR for more info: https://github.com/sveltejs/kit/pull/14622'
					);
				}
			});
		}

		Object.defineProperties(instance, {
			fields: {
				get: () =>
					create_field_proxy(
						{},
						() => input,
						(path, value) => {
							if (path.length === 0) {
								input = value;
							} else {
								deep_set(input, path.map(String), value);

								const key = build_path_string(path);
								touched[key] = true;
							}
						},
						() => issues
					)
			},
			result: {
				get: () => result
			},
			pending: {
				get: () => pending_count
			},
			preflight: {
				/** @type {RemoteForm<T, U>['preflight']} */
				value: (schema) => {
					preflight_schema = schema;
					return instance;
				}
			},
			validate: {
				/** @type {RemoteForm<any, any>['validate']} */
				value: async ({ includeUntouched = false, preflightOnly = false } = {}) => {
					if (!element) return;

					const id = ++validate_id;

					// wait a tick in case the user is calling validate() right after set() which takes time to propagate
					await tick();

					const default_submitter = /** @type {HTMLElement | undefined} */ (
						element.querySelector('button:not([type]), [type="submit"]')
					);

					const form_data = new FormData(element, default_submitter);

					/** @type {InternalRemoteFormIssue[]} */
					let array = [];

					const data = convert(form_data);

					const validated = await preflight_schema?.['~standard'].validate(data);

					if (validate_id !== id) {
						return;
					}

					if (validated?.issues) {
						array = validated.issues.map((issue) => normalize_issue(issue, false));
					} else if (!preflightOnly) {
						const response = await fetch(`${base}/${app_dir}/remote/${action_id_without_key}`, {
							method: 'POST',
							headers: {
								'Content-Type': BINARY_FORM_CONTENT_TYPE,
								// Validation should not be and will not be called during rendering, so it's save to use location here
								'x-sveltekit-pathname': location.pathname,
								'x-sveltekit-search': location.search
							},
							body: serialize_binary_form(data, {
								validate_only: true
							}).blob
						});

						const result = await response.json();

						if (validate_id !== id) {
							return;
						}

						if (result.type === 'result') {
							array = /** @type {InternalRemoteFormIssue[]} */ (
								devalue.parse(result.result, app.decoders)
							);
						}
					}

					if (!includeUntouched && !submitted) {
						array = array.filter((issue) => touched[issue.name]);
					}

					const is_server_validation = !validated?.issues && !preflightOnly;

					raw_issues = is_server_validation
						? array
						: merge_with_server_issues(form_data, raw_issues, array);
				}
			},
			enhance: {
				/** @type {RemoteForm<any, any>['enhance']} */
				value: (callback) => {
					return {
						method: 'POST',
						action,
						[createAttachmentKey()]: create_attachment(form_onsubmit(callback))
					};
				}
			}
		});

		return instance;
	}

	const instance = create_instance();

	Object.defineProperty(instance, 'for', {
		/** @type {RemoteForm<T, U>['for']} */
		value: (key) => {
			const entry = instances.get(key) ?? { count: 0, instance: create_instance(key) };

			try {
				$effect.pre(() => {
					return () => {
						entry.count--;

						void tick().then(() => {
							if (entry.count === 0) {
								instances.delete(key);
							}
						});
					};
				});

				entry.count += 1;
				instances.set(key, entry);
			} catch {
				// not in an effect context
			}

			return entry.instance;
		}
	});

	return instance;
}

/**
 * Shallow clone an element, so that we can access e.g. `form.action` without worrying
 * that someone has added an `<input name="action">` (https://github.com/sveltejs/kit/issues/7593)
 * @template {HTMLElement} T
 * @param {T} element
 * @returns {T}
 */
function clone(element) {
	return /** @type {T} */ (HTMLElement.prototype.cloneNode.call(element));
}

/**
 * @param {FormData} form_data
 * @param {string} enctype
 */
function validate_form_data(form_data, enctype) {
	for (const key of form_data.keys()) {
		if (/^\$[.[]?/.test(key)) {
			throw new Error(
				'`$` is used to collect all FormData validation issues and cannot be used as the `name` of a form control'
			);
		}
	}

	if (enctype !== 'multipart/form-data') {
		for (const value of form_data.values()) {
			if (value instanceof File) {
				throw new Error(
					'Your form contains <input type="file"> fields, but is missing the necessary `enctype="multipart/form-data"` attribute. This will lead to inconsistent behavior between enhanced and native forms. For more details, see https://github.com/sveltejs/kit/issues/9819.'
				);
			}
		}
	}
}
