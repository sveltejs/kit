/** @import { RemoteFormAction, RemoteQuery, RemoteFormResult } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */

import { app_dir } from '__sveltekit/paths';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import {
	app,
	invalidateAll,
	remote_responses,
	pending_invalidate,
	started,
	goto,
	set_nearest_error_page
} from './client.js';
import { create_remote_cache_key, parse_remote_args, stringify_remote_args } from '../shared.js';
import { HttpError, Redirect } from '../control.js';
/**
 * Contains a map of query functions that currently exist in the app.
 * Each value is a query's refresh function which will rerun the query.
 */
export const refreshMap = new Map();
/** @type {Map<string, [number, Promise<any>]>} */
export const resultMap = new Map();

let pending_refresh = false;

/**
 * Client-version of the `query`/`prerender`/`cache` function from `$app/server`.
 * @param {string} id
 * @param {boolean} prerender
 * @returns {RemoteQuery<any, any>}
 */
function remote_request(id, prerender) {
	let version = $state(0);

	// TODO disable "use event.fetch method instead" warning which can show up when you use remote functions in load functions
	const fn = async (/** @type {any} */ ...args) => {
		const stringified_args = stringify_remote_args(args, app.hooks.transport);
		const cache_key = create_remote_cache_key(id, stringified_args);

		// Reading the version ensures that the function reruns in reactive contexts if the version changes
		version;
		// TODO this is how we could get granular with the cache invalidation
		// const id = `${fn.key}|${stringified_args}`;
		// if (!queryMap.has(id)) {
		// 	version[id] = 0;
		// 	queryMap.set(id, () => version[id]++);
		// }
		// version[id]; // yes this will mean it reruns once for the first call but that is ok because of our caching

		let tracking = false;

		if ($effect.tracking()) {
			tracking = true;
			$effect.pre(() => () => {
				tracking = false;
				const entry = resultMap.get(cache_key);
				if (entry) {
					entry[0]--;
					queueMicrotask(() => {
						if (entry[0] === 0) {
							resultMap.delete(cache_key);
						}
					});
				}
			});
		}

		const entry = resultMap.get(cache_key);

		if (!entry) {
			const response = (async () => {
				if (!started) {
					const result = remote_responses[cache_key];
					if (result) {
						return result;
					}
				}

				const url = `/${app_dir}/remote/${id}${stringified_args ? (prerender ? `/${stringified_args}` : `?args=${stringified_args}`) : ''}`;
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error('Failed to execute remote function');
				}

				const result = /** @type { RemoteFunctionResponse} */ (await response.json());
				if (result.type === 'redirect') {
					await goto(result.location);
					fn.refresh();
					// We return a promise that never resolves so the current query does not error (we don't know the desired shape),
					// and the refresh just above should cause the query to rerun in case it's still around.
					return new Promise(() => {});
				} else if (result.type === 'error') {
					throw new HttpError(result.status ?? 500, result.error);
				} else {
					return devalue.parse(result.result, app.decoders);
				}
			})();

			resultMap.set(cache_key, [tracking ? 1 : 0, response]);

			response
				.then(() => {
					// We need this to delete the cache entry if the query was never tracked anywhere else in the meantime
					const entry = resultMap.get(cache_key);
					if (entry && entry[0] === 0) {
						resultMap.delete(cache_key);
					}
				})
				// Exceptions delete the cache right away
				.catch(() => {
					resultMap.delete(cache_key);
				});

			return response;
		} else {
			if (tracking) {
				entry[0]++;
			}
			return entry[1];
		}
	};

	/** @type {RemoteQuery<any, any>['refresh']} */
	fn.refresh = (filter) => {
		pending_refresh = true;
		queueMicrotask(() => {
			pending_refresh = false;
		});

		let refresh = false;
		const prefix = `${id}|`;
		for (const [key, entry] of resultMap) {
			if (key.startsWith(prefix)) {
				if (!filter) {
					resultMap.delete(key);
					refresh = true;
				} else {
					const stringified_args = key.slice(prefix.length);
					if (filter(entry[1], ...parse_remote_args(stringified_args, app.hooks.transport))) {
						resultMap.delete(key);
						refresh = true;
					}
				}
			}
		}

		if (refresh) {
			version++;
		}
	};

	/** @type {RemoteQuery<any, any>['override']} */
	fn.override = (update) => {
		const prefix = `${id}|`;
		let refetched = false;

		for (const [key, entry] of resultMap) {
			if (key.startsWith(prefix)) {
				const stringified_args = key.slice(prefix.length);
				const result = update(
					entry[1],
					...parse_remote_args(stringified_args, app.hooks.transport)
				);
				entry[1] = Promise.resolve(result);

				if (!refetched) {
					refetched = true;
					version++; // this will cause queries with other parameters to rerun aswell but it's fine since they are cached
				}
			}
		}
	};

	refreshMap.set(id, fn.refresh);

	return fn;
}

/**
 * @param {string} id
 */
export function query(id) {
	return remote_request(id, false);
}

/**
 * @param {string} id
 */
export function cache(id) {
	return remote_request(id, false);
}

/**
 * @param {string} id
 */
export function prerender(id) {
	return remote_request(id, true);
}

/**
 * Client-version of the `command` function from `$app/server`.
 * @param {string} id
 */
export function command(id) {
	return async (/** @type {any} */ ...args) => {
		const response = await fetch(`/${app_dir}/remote/${id}`, {
			method: 'POST',
			body: stringify_remote_args(args, app.hooks.transport),
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			// We only end up here in case of a network error or if the server has an internal error
			// (which shouldn't happen because we handle errors on the server and always send a 200 response)
			throw new Error('Failed to execute remote function');
		}

		const result = /** @type { RemoteFunctionResponse} */ (await response.json());
		if (result.type === 'redirect') {
			return goto(result.location, { invalidateAll: true });
		} else if (result.type === 'error') {
			throw new HttpError(result.status ?? 500, result.error);
		} else {
			// If we want to invalidate from the server, this is how we would do it
			// for (const key of JSON.parse(response.headers.get('x-sveltekit-rpc-invalidate') ?? '[]')) {
			// 	invalidate(key);
			// }

			// We gotta do three microtasks here because the first two will resolve before the promise is awaited by the caller so it will run too soon
			queueMicrotask(() => {
				queueMicrotask(() => {
					queueMicrotask(() => {
						// Users can granularily invalidate by calling query.refresh() or invalidate('foo:bar') themselves.
						// If that doesn't happen within a microtask we assume they want to invalidate everything.
						if (pending_invalidate || pending_refresh) return;
						invalidateAll();
					});
				});
			});

			return devalue.parse(result.result, app.decoders);
		}
	};
}

/**
 * Client-version of the `form` function from `$app/server`.
 * @param {string} id
 * @returns {RemoteFormAction<any, any>}
 */
export function form(id) {
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

	const action = '?/remote=' + encodeURIComponent(id);

	/** @type {any} */
	let result = $state(
		!started ? (remote_responses[create_remote_cache_key(action, '')] ?? undefined) : undefined
	);
	/** @type {any} */
	let error = $state(undefined);

	/**
	 * @param {HTMLFormElement} form
	 * @param {FormData} data
	 */
	async function submit(form, data) {
		const response = await fetch(`/${app_dir}/remote/${id}`, {
			method: 'POST',
			body: data
		});

		const form_result = /** @type {RemoteFormResult<any, any>} */ ({
			type: 'error',
			result: undefined,
			error: /** @type {any} */ (undefined),
			status: undefined,
			location: undefined,
			apply: async () => {
				if (form_result.type === 'redirect') {
					await goto(form_result.location, { invalidateAll: true });
				} else if (form_result.type === 'error') {
					await set_nearest_error_page(form_result.error, form_result.status);
				} else if (form_result.type === 'success') {
					form.reset();
					await invalidateAll();
				}
			}
		});

		if (!response.ok) {
			// We only end up here in case of a network error or if the server has an internal error
			// (which shouldn't happen because we handle errors on the server and always send a 200 response)
			form_result.error = error = { message: 'Failed to execute remote function' };
			form_result.status = 500;
			result = undefined;
			return form_result;
		}

		Object.assign(form_result, /** @type { RemoteFunctionResponse} */ (await response.json()));
		if (form_result.type === 'error') {
			result = undefined;
			error = form_result.error;
		} else if (form_result.type === 'success' || form_result.type === 'failure') {
			error = undefined;
			form_result.result = result = devalue.parse(
				/** @type {any} */ (form_result.result),
				app.decoders
			);
		}

		return form_result;
	}

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

	/** @param {Parameters<RemoteFormAction<any, any>['enhance']>[0]} callback */
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

			if (action.searchParams.get('/remote') !== id) {
				return;
			}

			event.preventDefault();

			const data = create_form_data(form, event.submitter);

			callback({
				form,
				data,
				submit: () => submit(form, data)
			});
		};
	};

	submit.method = 'POST';
	submit.action = action;
	submit.onsubmit = form_onsubmit(({ submit }) => submit().then((r) => r.apply()));

	/** @param {Parameters<RemoteFormAction<any, any>['formAction']['enhance']>[0]} callback */
	const form_action_onclick = (callback) => {
		/** @param {Event} event */
		return async (event) => {
			const target = /** @type {HTMLButtonElement} */ (event.target);
			const form = target.form;
			if (!form) return;

			// Prevent this from firing the form's submit event
			event.stopPropagation();
			event.preventDefault();

			const data = create_form_data(form, target);

			callback({
				form,
				data,
				submit: () => submit(form, data)
			});
		};
	};

	/** @type {RemoteFormAction<any, any>['formAction']} */
	// @ts-expect-error we gotta set enhance as a non-enumerable property
	const form_action = {
		type: 'submit',
		formaction: action,
		onclick: form_action_onclick(({ submit }) => submit().then((r) => r.apply()))
	};

	Object.defineProperty(form_action, 'enhance', {
		/** @type {RemoteFormAction<any, any>['formAction']['enhance']} */
		value: (callback) => {
			return {
				type: 'submit',
				formaction: action,
				onclick: form_action_onclick(callback)
			};
		},
		enumerable: false
	});

	Object.defineProperties(submit, {
		formAction: {
			value: form_action,
			enumerable: false
		},
		result: {
			get() {
				return result;
			},
			enumerable: false
		},
		error: {
			get() {
				return error;
			},
			enumerable: false
		},
		enhance: {
			/** @type {RemoteFormAction<any, any>['enhance']} */
			value: (callback) => {
				return {
					method: 'POST',
					action,
					onsubmit: form_onsubmit(callback)
				};
			},
			enumerable: false
		}
	});

	// @ts-expect-error we gotta set enhance etc as a non-enumerable properties
	return submit;
}
