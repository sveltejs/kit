/** @import { RemoteForm, RemoteQueryOverride } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
/** @import { Query } from './query.svelte.js' */
import { app_dir, base } from '__sveltekit/paths';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { HttpError } from '@sveltejs/kit/internal';
import {
	app,
	remote_responses,
	started,
	goto,
	set_nearest_error_page,
	invalidateAll
} from '../client.js';
import { tick } from 'svelte';
import { refresh_queries, release_overrides } from './shared.svelte.js';

/**
 * Client-version of the `form` function from `$app/server`.
 * @template T
 * @param {string} id
 * @returns {RemoteForm<T>}
 */
export function form(id) {
	/** @type {Map<any, { count: number, instance: RemoteForm<T> }>} */
	const instances = new Map();

	/** @param {string | number | boolean} [key] */
	function create_instance(key) {
		const action_id = id + (key != undefined ? `/${JSON.stringify(key)}` : '');
		const action = '?/remote=' + encodeURIComponent(action_id);

		/** @type {any} */
		let result = $state(started ? undefined : remote_responses[action_id]);

		/** @type {number} */
		let pending_count = $state(0);

		/**
		 * @param {FormData} data
		 * @returns {Promise<any> & { updates: (...args: any[]) => any }}
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

			// Increment pending count when submission starts
			pending_count++;

			/** @type {Array<Query<any> | RemoteQueryOverride>} */
			let updates = [];

			/** @type {Promise<any> & { updates: (...args: any[]) => any }} */
			const promise = (async () => {
				try {
					await Promise.resolve();

					if (updates.length > 0) {
						if (DEV) {
							if (data.get('sveltekit:remote_refreshes')) {
								throw new Error(
									'The FormData key `sveltekit:remote_refreshes` is reserved for internal use and should not be set manually'
								);
							}
						}
						data.set('sveltekit:remote_refreshes', JSON.stringify(updates.map((u) => u._key)));
					}

					const response = await fetch(`${base}/${app_dir}/remote/${action_id}`, {
						method: 'POST',
						body: data
					});

					if (!response.ok) {
						// We only end up here in case of a network error or if the server has an internal error
						// (which shouldn't happen because we handle errors on the server and always send a 200 response)
						result = undefined;
						throw new Error('Failed to execute remote function');
					}

					const form_result = /** @type { RemoteFunctionResponse} */ (await response.json());

					if (form_result.type === 'result') {
						result = devalue.parse(form_result.result, app.decoders);

						if (form_result.refreshes) {
							refresh_queries(form_result.refreshes, updates);
						} else {
							void invalidateAll();
						}
					} else if (form_result.type === 'redirect') {
						const refreshes = form_result.refreshes ?? '';
						const invalidateAll = !refreshes && updates.length === 0;
						if (!invalidateAll) {
							refresh_queries(refreshes, updates);
						}
						void goto(form_result.location, { invalidateAll });
					} else {
						result = undefined;
						throw new HttpError(500, form_result.error);
					}
				} catch (e) {
					release_overrides(updates);
					throw e;
				} finally {
					// Decrement pending count when submission completes
					pending_count--;

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

			promise.updates = (...args) => {
				updates = args;
				return promise;
			};

			return promise;
		}

		/** @type {RemoteForm<T>} */
		const instance = {};

		instance.method = 'POST';
		instance.action = action;

		/**
		 * @param {HTMLFormElement} form_element
		 * @param {HTMLElement | null} submitter
		 */
		function create_form_data(form_element, submitter) {
			const form_data = new FormData(form_element);

			if (DEV) {
				const enctype = submitter?.hasAttribute('formenctype')
					? /** @type {HTMLButtonElement | HTMLInputElement} */ (submitter).formEnctype
					: clone(form_element).enctype;
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

			const submitter_name = submitter?.getAttribute('name');
			if (submitter_name) {
				form_data.append(submitter_name, submitter?.getAttribute('value') ?? '');
			}

			return form_data;
		}

		/** @param {Parameters<RemoteForm<any>['enhance']>[0]} callback */
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

				event.preventDefault();

				const data = create_form_data(form, event.submitter);

				try {
					await callback({
						form,
						data,
						submit: () => submit(data)
					});
				} catch (e) {
					const error =
						e instanceof HttpError ? e.body : { message: /** @type {any} */ (e).message };
					const status = e instanceof HttpError ? e.status : 500;
					void set_nearest_error_page(error, status);
				}
			};
		};

		instance.onsubmit = form_onsubmit(({ submit }) => submit());

		/** @param {Parameters<RemoteForm<any>['buttonProps']['enhance']>[0]} callback */
		const form_action_onclick = (callback) => {
			/** @param {Event} event */
			return async (event) => {
				const target = /** @type {HTMLButtonElement} */ (event.currentTarget);
				const form = target.form;
				if (!form) return;

				// Prevent this from firing the form's submit event
				event.stopPropagation();
				event.preventDefault();

				const data = create_form_data(form, target);

				try {
					await callback({
						form,
						data,
						submit: () => submit(data)
					});
				} catch (e) {
					const error =
						e instanceof HttpError ? e.body : { message: /** @type {any} */ (e).message };
					const status = e instanceof HttpError ? e.status : 500;
					void set_nearest_error_page(error, status);
				}
			};
		};

		/** @type {RemoteForm<any>['buttonProps']} */
		// @ts-expect-error we gotta set enhance as a non-enumerable property
		const button_props = {
			type: 'submit',
			formmethod: 'POST',
			formaction: action,
			onclick: form_action_onclick(({ submit }) => submit())
		};

		Object.defineProperty(button_props, 'enhance', {
			/** @type {RemoteForm<any>['buttonProps']['enhance']} */
			value: (callback) => {
				return {
					type: 'submit',
					formmethod: 'POST',
					formaction: action,
					onclick: form_action_onclick(callback)
				};
			}
		});

		Object.defineProperty(button_props, 'pending', {
			get: () => pending_count
		});

		Object.defineProperties(instance, {
			buttonProps: {
				value: button_props
			},
			result: {
				get: () => result
			},
			pending: {
				get: () => pending_count
			},
			enhance: {
				/** @type {RemoteForm<any>['enhance']} */
				value: (callback) => {
					return {
						method: 'POST',
						action,
						onsubmit: form_onsubmit(callback)
					};
				}
			}
		});

		return instance;
	}

	const instance = create_instance();

	Object.defineProperty(instance, 'for', {
		/** @type {RemoteForm<any>['for']} */
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
