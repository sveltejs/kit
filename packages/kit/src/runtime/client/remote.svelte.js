/** @import { RemoteFormAction, RemoteQuery } from '@sveltejs/kit' */
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
	set_nearest_error_page,
	result_map,
	refresh_map
} from './client.js';
import { create_remote_cache_key, stringify_remote_args } from '../shared.js';
import { HttpError, Redirect } from '../control.js';

let pending_refresh = false;

/**
 * @type {Map<string, Array<(value: any) => any>>}
 * A map of remote function ids to their overrides.
 * Separate from `result_map` because we want to be able to refresh queries (which deletes the `result_map` entry)
 * but keep the overrides until they are released or no query is in a reactive context anymore.
 */
const overrides_map = new Map();

/**
 * Client-version of the `query`/`prerender`/`cache` function from `$app/server`.
 * @param {string} id
 * @param {boolean} prerender
 * @returns {RemoteQuery<any, any>}
 */
function remote_request(id, prerender) {
	let version = $state(0);

	// TODO disable "use event.fetch method instead" warning which can show up when you use remote functions in load functions
	/** @type {RemoteQuery<any, any>} */
	const fn = (/** @type {any} */ ...args) => {
		const stringified_args = stringify_remote_args(args, app.hooks.transport);
		const cache_key = create_remote_cache_key(id, stringified_args);

		let always_tracking = true;
		/** True once a real fetch (not override) has resolved (_not_ rejected) for the first time */
		let initialized = false;
		let original_current = $state.raw();
		let current = $derived(apply_overrides(original_current));
		let error = $state.raw();
		let pending = $state.raw(true);

		try {
			const entry = result_map.get(cache_key);
			$effect.pre(() => {
				if (entry) entry[0]++;
				return () => {
					const entry = result_map.get(cache_key);
					if (entry) {
						entry[0]--;
						queueMicrotask(() => {
							if (entry[0] === 0) {
								result_map.delete(cache_key);
								overrides_map.delete(cache_key);
							}
						});
					}
				};
			});
		} catch {
			always_tracking = false;
		}

		if (always_tracking) {
			retrieve(true).catch(() => {}); // Avoid unhandled promise rejection warnings
		}

		/** @param {boolean} tracking */
		function retrieve(tracking) {
			const entry = result_map.get(cache_key);

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
						throw new HttpError(500, 'Failed to execute remote function');
					}

					const result = /** @type { RemoteFunctionResponse} */ (await response.json());
					if (result.type === 'redirect') {
						result_map.delete(cache_key);
						version++;
						await goto(result.location); // TODO this could be old at this point, check query cache
						// We throw because we don't know the desired shape. We do so after a timeout so that
						// the refresh just above will cause the query to rerun in case it's still around, which means Svelte's
						// async will ignore this async batch.
						await new Promise((r) => setTimeout(r, 0));
						throw new Redirect(307, result.location);
					} else if (result.type === 'error') {
						throw new HttpError(result.status ?? 500, result.error);
					} else {
						return devalue.parse(result.result, app.decoders);
					}
				})();

				const overrides = $state(overrides_map.get(cache_key) ?? []);
				overrides_map.set(cache_key, overrides);
				result_map.set(cache_key, [tracking ? 1 : 0, response, update_query]);

				return response
					.then((result) => {
						const entry = result_map.get(cache_key);
						// Only update if response wasn't superseeded by a new call
						if (entry && entry[1] === response) {
							// We need this to delete the cache entry if the query was never tracked anywhere else in the meantime
							if (entry[0] === 0) {
								result_map.delete(cache_key);
								overrides_map.delete(cache_key);
							}

							if (overrides_map.get(cache_key)?.length) {
								update_query(result);

								return current;
							} else {
								initialized = true;
								pending = false;
								original_current = result;
								error = undefined;

								return current;
							}
						} else {
							// Some old call that was superseeded by a new call; still return accurate data from that point in time
							return apply_overrides(result);
						}
					})
					.catch((e) => {
						// Exceptions delete the cache right away unless they're already superseeded by a new call
						if (response === result_map.get(cache_key)?.[1]) {
							result_map.delete(cache_key);
							pending = false;
							original_current = undefined;
							error = e;
						}

						throw e;
					});
			} else {
				if (!initialized) {
					// fill in the current state
					// TODO maybe entry needs to save current etc instead?
					entry[1]
						.then((result) => {
							const e = result_map.get(cache_key);
							// Only update if response wasn't superseeded by a new call
							if (e && e[1] === entry[1]) {
								original_current = result;
								initialized = true;
								pending = false;
								error = undefined;
							}
						})
						.catch((e) => {
							if (entry[1] === result_map.get(cache_key)?.[1]) {
								pending = false;
								current = original_current = undefined;
								error = e;
							}
						});
				}

				return entry[1].then(() => {
					return current;
				});
			}
		}

		function track() {
			let tracking = always_tracking;

			if (!tracking && $effect.tracking()) {
				tracking = true;
				// We have to increase the listener count here since not every get is necessarily a new call,
				// (e.g. `typeof x.then === 'function'`), so we would count down more than up otherwise.
				const entry = result_map.get(cache_key);
				if (entry) entry[0]++;
				$effect.pre(() => () => {
					const entry = result_map.get(cache_key);
					if (entry) {
						entry[0]--;
						queueMicrotask(() => {
							if (entry[0] === 0) {
								result_map.delete(cache_key);
								overrides_map.delete(cache_key);
							}
						});
					}
				});
			}

			return tracking;
		}

		/** @type {Array<() => void>} */
		const pending_updates = [];

		function apply_updates() {
			if (pending_updates.length === 0) return;
			pending_updates.forEach((update) => update());
			pending_updates.length = 0;
			version++; // this will cause queries with other parameters to rerun aswell but it's fine since they are cached
		}

		/**
		 * @param {unknown} value
		 */
		function update_query(value) {
			pending_updates.push(() => {
				const entry = result_map.get(cache_key);
				if (!entry) return;

				pending = false;
				error = undefined;
				original_current = value;
				entry[1] = Promise.resolve(value);
			});

			// Two microtasks because Svelte wraps awaits which causes another microtask,
			// and we want to ensure we wait for the next synchronous release that is potentially happening
			if (overrides_map.get(cache_key)?.length) {
				queueMicrotask(() => {
					queueMicrotask(() => {
						apply_updates();
					});
				});
			} else {
				apply_updates();
			}
		}

		/** @param {unknown} value */
		function apply_overrides(value) {
			const entry = overrides_map.get(cache_key);
			if (!entry) return value;

			for (const update of entry) {
				value = update(value);
			}

			return value;
		}

		return {
			get then() {
				// Reading the version ensures that the function reruns in reactive contexts if the version changes
				// We gotta do it here in the getter and then in return a function because `await promise` would call
				// the function asynchronously, which would mean "$effect.tracking" is always false. The getter on the other hand
				// is called synchronously, so we can check if we're in an effect there.
				version;

				// Similarly we need to see if we're in a tracking context inside the getter, not upon function invocation
				let tracking = track();

				// TODO this is how we could get granular with the cache invalidation
				// const id = `${fn.key}|${stringified_args}`;
				// if (!queryMap.has(id)) {
				// 	version[id] = 0;
				// 	queryMap.set(id, () => version[id]++);
				// }
				// version[id]; // yes this will mean it reruns once for the first call but that is ok because of our caching

				/** @type {Promise<any>['then']} */
				return (resolve, reject) => {
					return retrieve(tracking).then(resolve, reject);
				};
			},
			get catch() {
				version;

				let tracking = track();

				/** @type {Promise<any>['catch']} */
				return (reject) => {
					return retrieve(tracking).catch(reject);
				};
			},
			get finally() {
				version;

				let tracking = track();

				/** @type {Promise<any>['finally']} */
				return (callback) => {
					return retrieve(tracking).finally(callback);
				};
			},
			[Symbol.toStringTag]: '[object RemoteQuery]',
			get current() {
				return current;
			},
			get error() {
				return error;
			},
			get pending() {
				return pending;
			},
			refresh: async () => {
				pending = true;
				pending_refresh = true;

				// two because it's three in the corresponding "possibly invalidate all logic" in the command function
				queueMicrotask(() => {
					queueMicrotask(() => {
						pending_refresh = false;
					});
				});

				result_map.delete(cache_key);
				version++;
				await new Promise((r) => setTimeout(r, 0)); // wait for the next macrotask to ensure that the query is rerun
				await result_map.get(cache_key)?.[1];
			},
			override: async (update) => {
				const overrides = overrides_map.get(cache_key);
				const entry = result_map.get(cache_key);
				if (!entry || !overrides) return () => {}; // TODO warn in dev mode if not available?

				overrides.push(update);
				apply_updates();
				version++;
				return () => {
					apply_updates();
					const idx = overrides.indexOf(update);
					if (idx !== -1) {
						overrides.splice(idx, 1);
						version++;
					}
				};
			}
		};
	};

	refresh_map.set(id, () => {
		for (const key of result_map.keys()) {
			if (key.startsWith(id + '|')) {
				result_map.delete(key);
			}
		}
		version++;
	});

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

		const result = /** @type {RemoteFunctionResponse} */ (await response.json());
		if (result.type === 'redirect') {
			throw new Error(
				'Redirects are not allowed in commands. Return a result instead and use goto on the client'
			);
		} else if (result.type === 'error') {
			throw new HttpError(result.status ?? 500, result.error);
		} else {
			refresh_queries(result);

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

	const instance_cache = new Map();

	/** @param {string | number | boolean} [key] */
	function create_instance(key) {
		const action_id = id + (key ? `/${JSON.stringify(key)}` : '');
		const action = '?/remote=' + encodeURIComponent(action_id);

		/** @type {any} */
		let result = $state(
			!started ? (remote_responses[create_remote_cache_key(action, '')] ?? undefined) : undefined
		);
		/** @type {any} */
		let error = $state(undefined);

		/** @param {FormData} data */
		async function submit(data) {
			const response = await fetch(`/${app_dir}/remote/${action_id}`, {
				method: 'POST',
				body: data
			});

			if (!response.ok) {
				// We only end up here in case of a network error or if the server has an internal error
				// (which shouldn't happen because we handle errors on the server and always send a 200 response)
				error = { message: 'Failed to execute remote function' };
				result = undefined;
				throw new Error(error.message);
			}

			const form_result = /** @type { RemoteFunctionResponse} */ (await response.json());

			if (form_result.type === 'result') {
				error = undefined;
				result = devalue.parse(form_result.result, app.decoders);

				refresh_queries(form_result);
			} else if (form_result.type === 'redirect') {
				const refreshes = form_result.refreshes
					? Object.entries(devalue.parse(form_result.refreshes, app.decoders))
					: [];
				for (const [key, value] of refreshes) {
					// Update the query with the new value
					const entry = result_map.get(key);
					entry?.[2](value);
				}
				goto(form_result.location, { invalidateAll: refreshes.length === 0 });
			} else {
				result = undefined;
				error = form_result.error;
				throw new HttpError(500, error);
			}
		}

		/** @param {() => Promise<void>} submit */
		function default_submit(submit) {
			submit().catch((e) => {
				const error = e instanceof HttpError ? e.body : { message: e.message };
				const status = e instanceof HttpError ? e.status : 500;
				set_nearest_error_page(error, status);
			});
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

				if (action.searchParams.get('/remote') !== action_id) {
					return;
				}

				event.preventDefault();

				const data = create_form_data(form, event.submitter);

				callback({
					form,
					data,
					submit: () => submit(data)
				});
			};
		};

		submit.method = 'POST';
		submit.action = action;
		submit.onsubmit = form_onsubmit(({ submit }) => default_submit(submit));

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
					submit: () => submit(data)
				});
			};
		};

		/** @type {RemoteFormAction<any, any>['formAction']} */
		// @ts-expect-error we gotta set enhance as a non-enumerable property
		const form_action = {
			type: 'submit',
			formaction: action,
			onclick: form_action_onclick(({ submit }) => default_submit(submit))
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

		if (!key) {
			Object.defineProperty(submit, 'for', {
				/** @type {RemoteFormAction<any, any>['for']} */
				value: (key) => {
					let entry = instance_cache.get(key);

					let tracking = true;
					try {
						$effect.pre(() => {
							return () => {
								entry[0]--;
								queueMicrotask(() => {
									if (entry[0] === 0) {
										instance_cache.delete(key);
									}
								});
							};
						});
					} catch {
						tracking = false;
					}

					if (tracking) {
						if (!entry) {
							instance_cache.set(key, (entry = [1, create_instance(key)]));
						} else {
							entry[0]++;
						}
					} else if (!entry) {
						entry = [0, create_instance(key)];
					}

					return entry[1];
				},
				enumerable: false
			});
		}

		return submit;
	}

	// @ts-expect-error we gotta set enhance etc as a non-enumerable properties
	return create_instance();
}

/**
 * @param {RemoteFunctionResponse & { type: 'result'}} result
 */
function refresh_queries(result) {
	const refreshes = Object.entries(devalue.parse(result.refreshes, app.decoders));
	if (refreshes.length > 0) {
		for (const [key, value] of refreshes) {
			// Update the query with the new value
			const entry = result_map.get(key);
			entry?.[2](value);
		}
	} else {
		// We gotta do three microtasks here because the first two will resolve before the promise is awaited by the caller so it will run too soon
		// TODO it's three because we do `await safe` in dev mode in async Svelte; should we use setTimeout instead?
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
	}
}
