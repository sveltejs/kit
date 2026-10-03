/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { InternalRemoteFormIssue } from 'types' */
/** @import { UniversalFormOutput } from '../shared.js' */
import { DEV } from 'esm-env';
import { tick } from 'svelte';
import { createAttachmentKey } from 'svelte/attachments';
import { Redirect } from '@sveltejs/kit/internal';
import {
	_goto,
	handle_error,
	invalidateAll,
	set_nearest_error_page,
	universal_responses
} from '../../../client/client.js';
import { page } from '#app/state/client';
import {
	build_path_string,
	coerce_form_value,
	convert_formdata,
	create_field_proxy,
	deep_get,
	deep_set,
	DELETE_KEY,
	flatten_issues,
	normalize_issue,
	parse_form_key,
	set_nested_value
} from '../../../form-utils.js';
import {
	UNIVERSAL_ACTION_PARAM,
	attach_internals,
	create_internals,
	get_form_action_id,
	run_form_handler
} from '../shared.js';
import { get_id } from './cache.svelte.js';
import { categorize_updates, refresh_resources } from './updates.js';

/**
 * Client-side version of `form` from `$app/universal`. Submissions are handled entirely in the browser:
 * the data is validated with the schema (if any), then the handler runs locally.
 *
 * @param {any} validate_or_fn
 * @param {(data_or_issue: any, issue?: any) => any} [maybe_fn]
 */
export function form(validate_or_fn, maybe_fn) {
	/** @type {any} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {StandardSchemaV1 | null} */
	const schema =
		!maybe_fn || validate_or_fn === 'unchecked' ? null : /** @type {any} */ (validate_or_fn);

	const __ = create_internals('form');

	/** @type {Map<any, { count: number, instance: any }>} */
	const instances = new Map();

	/**
	 * @param {any} [key]
	 */
	function create_instance(key) {
		// The id is assigned by the Vite plugin after the module was evaluated,
		// so everything that depends on it must be computed lazily
		const get_form_id = () => get_id(__);
		const get_action_id = () => get_form_action_id(get_form_id(), key);

		/** @type {ReturnType<typeof create_state> | null} */
		let state = null;

		const get_state = () => {
			if (!state) {
				// create the state in its own reactive root, so that its deriveds aren't
				// torn down when the component that first accessed it is destroyed
				$effect.root(() => {
					state = create_state();
				});
			}

			return /** @type {ReturnType<typeof create_state>} */ (state);
		};

		function create_state() {
			// the output of a non-enhanced submission that resulted in this page —
			// consume it so the form's state survives hydration
			const action_id = get_action_id();
			/** @type {UniversalFormOutput | undefined} */
			const initial = universal_responses.f[action_id];
			delete universal_responses.f[action_id];

			/** @type {Record<string, any>} */
			let input = $state(initial?.input ?? {});

			/** @type {InternalRemoteFormIssue[]} */
			let raw_issues = $state.raw(initial?.issues ?? []);

			const issues = $derived(flatten_issues(raw_issues));

			/** @type {any} */
			let result = $state.raw(initial?.result);

			let pending_count = $state(0);

			/** @type {Record<string, boolean>} */
			let touched = $state({});

			/** @type {Record<string, boolean>} */
			let dirty = $state({});

			/** @type {Record<string, boolean>} */
			let can_validate = {};

			let submitted = $state(!!initial);

			/** @type {HTMLFormElement | null} */
			let element = null;

			/** @type {{ name: string; type: 'number' | 'boolean' | null; is_array: boolean } | null} */
			let previous_submitter = null;

			/**
			 * @param {any} instance
			 */
			let enhance_callback = async (instance) => {
				if (await instance.submit()) {
					await tick();
					// We call reset from the prototype to avoid DOM clobbering
					if (instance.element.isConnected) {
						HTMLFormElement.prototype.reset.call(instance.element);
					}
				}
			};

			/**
			 * @param {FormData} form_data
			 * @returns {Record<string, any>}
			 */
			function convert(form_data) {
				const data = convert_formdata(get_form_id(), form_data);
				if (key !== undefined && !('id' in data)) {
					data.id = key;
				}
				return data;
			}

			/**
			 * Validate the form data and run the handler locally.
			 * @param {FormData} form_data
			 * @returns {Promise<boolean> & { updates: (...args: any[]) => Promise<boolean> }}
			 */
			function submit(form_data) {
				// keep a keyed instance alive for the duration of the submission
				const entry = instances.get(key);
				if (entry) entry.count++;

				let updates = /** @type {ReturnType<typeof categorize_updates> | null} */ (null);

				/** @type {unknown} */
				let updates_error;

				const promise =
					/** @type {Promise<boolean> & { updates: (...args: any[]) => Promise<boolean> }} */ (
						(async () => {
							try {
								// give `.updates(...)` a chance to be called
								await Promise.resolve();

								if (updates_error) throw updates_error;

								/** @type {UniversalFormOutput} */
								let output;

								try {
									output = await run_form_handler(
										schema,
										fn,
										!!maybe_fn,
										convert(form_data),
										false
									);
								} catch (error) {
									if (error instanceof Redirect) {
										if (updates) {
											await refresh_resources(updates.resources);
										}

										// if the developer didn't take control via `.updates(...)`, refresh everything
										await _goto(error.location, { refreshAll: !updates });
										return true;
									}

									throw error;
								}

								raw_issues = output.issues ?? [];
								result = output.result;

								const succeeded = raw_issues.length === 0;

								if (succeeded) {
									if (updates) {
										await refresh_resources(updates.resources);
									} else {
										// like a full page reload after a form submission, refresh all
										// queries (remote and universal) and load functions
										await invalidateAll();
									}
								}

								return succeeded;
							} catch (e) {
								result = undefined;
								raw_issues = [];
								throw e;
							} finally {
								updates?.overrides.forEach((release) => release());

								void tick().then(() => {
									if (entry) {
										entry.count--;
										if (entry.count === 0) {
											instances.delete(key);
										}
									}
								});
							}
						})()
					);

				let updates_called = false;

				promise.updates = (...args) => {
					if (updates_called) return promise;
					updates_called = true;

					try {
						updates = categorize_updates(args);
					} catch (error) {
						updates_error = error;
					}

					return promise;
				};

				return promise;
			}

			/**
			 * Validate the given form data against the schema, updating the issues.
			 * @param {FormData} form_data
			 * @param {boolean} all
			 */
			async function validate_data(form_data, all) {
				const validated = await schema?.['~standard'].validate(convert(form_data));

				let array = validated?.issues?.map((issue) => normalize_issue(issue, false)) ?? [];

				if (!all && !submitted) {
					array = array.filter((issue) => can_validate[issue.name]);
				}

				raw_issues = array;
				return array.length === 0;
			}

			/**
			 * @param {HTMLFormElement} form
			 * @param {FormData} form_data
			 */
			function create_enhance_callback_instance(form, form_data) {
				const { enhance: _enhance, ...descriptors } = Object.getOwnPropertyDescriptors(outer);
				void _enhance;

				return Object.defineProperties(
					{},
					{
						...descriptors,
						element: { value: form },
						submit: { value: () => submit(form_data) }
					}
				);
			}

			/**
			 * @param {HTMLFormElement} form
			 */
			function attach(form) {
				if (element) {
					throw new Error(
						'A universal form object can only be attached to a single `<form>` element. Use `myForm.for(key)` to create multiple instances'
					);
				}

				element = form;

				touched = {};
				dirty = {};
				can_validate = {};

				/** @param {SubmitEvent} event */
				const handle_submit = async (event) => {
					const form = /** @type {HTMLFormElement} */ (event.target);
					const method = event.submitter?.hasAttribute('formmethod')
						? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formMethod
						: clone(form).method;

					if (method !== 'post') return;

					const action = new URL(
						event.submitter?.hasAttribute('formaction')
							? /** @type {HTMLButtonElement | HTMLInputElement} */ (event.submitter).formAction
							: clone(form).action
					);

					if (action.searchParams.get(UNIVERSAL_ACTION_PARAM) !== get_action_id()) {
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
					const form_id = get_form_id();

					if (
						previous_submitter !== null &&
						!Array.from(form_data.keys())
							.map((k) => parse_form_key(form_id, k).name)
							.includes(previous_submitter.name)
					) {
						set_nested_value(input, previous_submitter, undefined);
					}

					if (
						event.submitter &&
						/** @type {HTMLInputElement} */ (event.submitter).type !== 'image'
					) {
						const name = event.submitter.getAttribute('name');

						/** @type {null | ReturnType<typeof parse_form_key>} */
						let submitter = null;

						const value = /** @type {any} */ (event.submitter).value;

						if (name !== null && value !== undefined) {
							submitter = parse_form_key(form_id, name);
							set_nested_value(input, submitter, coerce_form_value(submitter.type, value));
						}

						previous_submitter = submitter;
					} else {
						previous_submitter = null;
					}

					submitted = true;

					try {
						pending_count++;
						await enhance_callback(create_enhance_callback_instance(form, form_data));
					} catch (e) {
						const error = await handle_error(e, {
							params: {},
							route: { id: null },
							url: new URL(location.href)
						});
						void set_nearest_error_page(error);
					} finally {
						pending_count--;
					}
				};

				/** @param {Event} event */
				const handle_input = (event) => {
					const element = /** @type {HTMLInputElement} */ (event.target);

					const name = element.name;
					if (!name) return;

					const field = parse_form_key(get_form_id(), name);
					const is_file = element.type === 'file';

					if (field.is_array) {
						let value;

						if (element.tagName === 'SELECT') {
							value = Array.from(
								element.querySelectorAll('option:checked'),
								(e) => /** @type {HTMLOptionElement} */ (e).value
							);
						} else {
							const elements = /** @type {HTMLInputElement[]} */ (
								Array.from(form.querySelectorAll(`[name="${name}"]`))
							);

							value = is_file
								? elements.map((input) => Array.from(input.files ?? [])).flat()
								: elements.map((element) => element.value);

							if (element.type === 'checkbox') {
								value = /** @type {string[]} */ (value.filter((_, i) => elements[i].checked));
							}
						}

						set_nested_value(input, field, is_file ? value : coerce_form_value(field.type, value));
					} else if (is_file) {
						const file = /** @type {HTMLInputElement & { files: FileList }} */ (element).files[0];
						set_nested_value(input, field, file ?? DELETE_KEY);
					} else {
						set_nested_value(
							input,
							field,
							coerce_form_value(
								field.type,
								element.type === 'checkbox' && !element.checked ? null : element.value
							)
						);
					}

					dirty[field.name] = true;
				};

				const handle_reset = async () => {
					// the `reset` event occurs before the inputs are actually updated
					await tick();

					input = convert_formdata(get_form_id(), new FormData(form));
					raw_issues = [];
					touched = {};
					dirty = {};
					can_validate = {};
					submitted = false;
				};

				/** @param {Event} e */
				const handle_focusout = (e) => {
					const name = /** @type {HTMLInputElement} */ (e.target).name;
					if (!name) return;

					const field = parse_form_key(get_form_id(), name);

					touched[field.name] = true;

					if (Object.hasOwn(dirty, field.name)) {
						can_validate[field.name] = true;
					}
				};

				form.addEventListener('submit', handle_submit);
				form.addEventListener('input', handle_input);
				form.addEventListener('focusout', handle_focusout);
				form.addEventListener('reset', handle_reset);

				return () => {
					form.removeEventListener('submit', handle_submit);
					form.removeEventListener('input', handle_input);
					form.removeEventListener('focusout', handle_focusout);
					form.removeEventListener('reset', handle_reset);
					element = null;
				};
			}

			return {
				attach,
				get element() {
					return element;
				},
				get result() {
					return result;
				},
				get pending() {
					return pending_count;
				},
				get submitted() {
					return submitted;
				},
				get fields() {
					return create_field_proxy({
						form_id: get_form_id(),
						get: () => input,
						set: (path, value) => {
							if (path.length === 0) {
								input = value;
							} else if (value !== deep_get(input, path)) {
								deep_set(input, path.map(String), value);

								const key = build_path_string(path);

								if (element) {
									touched[key] = true;
									dirty[key] = true;
									can_validate[key] = true;
								}
							}
						},
						get_issues: () => issues,
						get_touched: () => touched,
						get_dirty: () => dirty
					});
				},
				submit() {
					if (!element) {
						throw new Error('Cannot call `submit()` on a form that is not attached to an element');
					}

					const default_submitter = /** @type {HTMLElement | undefined} */ (
						element.querySelector('button:not([type]), [type="submit"], [type="image"]')
					);

					const form_data = new FormData(element, default_submitter);

					submitted = true;
					pending_count++;

					const submission = submit(form_data);

					const decrement = () => {
						pending_count--;
					};
					void submission.then(decrement, decrement);

					return submission;
				},
				/** @param {{ all?: boolean }} [options] */
				async validate({ all = false } = {}) {
					// wait a tick in case `validate()` is called right after `set()`, which takes time to propagate
					await tick();

					if (!element) return;

					const default_submitter = /** @type {HTMLElement | undefined} */ (
						element.querySelector('button:not([type]), [type="submit"], [type="image"]')
					);

					await validate_data(new FormData(element, default_submitter), all);
				},
				/** @param {(instance: any) => any} callback */
				enhance(callback) {
					enhance_callback = callback;
				}
			};
		}

		/** @type {Record<PropertyKey, any>} */
		const outer = { method: 'POST' };

		Object.defineProperty(outer, 'action', {
			get: () => {
				// mirror the server: keep the current search params, so that the page renders the same after a non-enhanced submission
				const params = new URLSearchParams(page.url.search);
				params.delete(UNIVERSAL_ACTION_PARAM);
				const query = params.toString();

				const action_id =
					key === undefined
						? get_form_id()
						: `${get_form_id()}/${encodeURIComponent(JSON.stringify(key))}`;

				return `?${query ? `${query}&` : ''}${UNIVERSAL_ACTION_PARAM}=${action_id}`;
			},
			enumerable: true
		});

		outer[createAttachmentKey()] = (/** @type {HTMLFormElement} */ form) =>
			get_state().attach(form);

		Object.defineProperties(outer, {
			element: { get: () => get_state().element },
			result: { get: () => get_state().result },
			pending: { get: () => get_state().pending },
			submitted: { get: () => get_state().submitted },
			fields: { get: () => get_state().fields },
			submit: { value: () => get_state().submit() },
			validate: {
				/** @param {{ all?: boolean }} [options] */
				value: (options) => get_state().validate(options)
			},
			enhance: {
				/** @param {(instance: any) => any} callback */
				value: (callback) => {
					get_state().enhance(callback);
					return outer;
				}
			}
		});

		return outer;
	}

	const instance = create_instance();

	Object.defineProperty(instance, 'for', {
		/** @param {any} key */
		value: (key) => {
			const entry = instances.get(key) ?? { count: 0, instance: create_instance(key) };

			try {
				$effect.pre(() => {
					entry.count += 1;
					instances.set(key, entry);

					return () => {
						entry.count--;

						void tick().then(() => {
							if (entry.count === 0 && instances.get(key) === entry) {
								instances.delete(key);
							}
						});
					};
				});
			} catch {
				// not in an effect context
			}

			return entry.instance;
		}
	});

	if (DEV) {
		// make it easier to spot forms in the devtools
		Object.defineProperty(instance, Symbol.toStringTag, { value: 'UniversalForm' });
	}

	return attach_internals(instance, __);
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
