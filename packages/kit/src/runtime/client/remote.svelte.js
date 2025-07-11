/** @import { RemoteFormAction, RemoteQuery } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */

import { app_dir } from '__sveltekit/paths';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import {
	app,
	invalidateAll,
	remote_responses,
	started,
	goto,
	set_nearest_error_page,
	result_map,
	refresh_map
} from './client.js';
import { create_remote_cache_key, stringify_remote_arg } from '../shared.js';

/**
 * Waits for three microtasks by default which is the necessary amount of ticks to ensure that
 * it runs after Svelte's reacticity system has processed changes.
 * In prod two would be enough but in dev we need three because of the wrapping "check reactivity loss" function.
 * @returns {Promise<void>}
 */
function wait(times = 3) {
	return Promise.resolve().then(() => (times > 0 ? wait(times - 1) : undefined));
}

/**
 * @template T
 * @implements {Partial<Promise<T>>}
 */
class Resource {
	/** @type {() => Promise<void>} */
	#fn;
	#loading = $state(true);
	/** @type {Array<() => void>} */
	#latest = [];

	/** @type {boolean} */
	#inited = $state(false);
	/** @type {T | undefined} */
	#raw = $state.raw();
	/** @type {Promise<void>} */
	#promise;
	/** @type {Array<(old: T) => T>} */
	#overrides = $state([]);

	/** @type {T | undefined} */
	#current = $derived.by(() => {
		// don't reduce undefined value
		if (!this.#inited) return undefined;

		return this.#overrides.reduce((v, r) => r(v), /** @type {T} */ (this.#raw));
	});

	/** @type {Promise<T>['then']} */
	// @ts-expect-error TS doesn't understand that the promise returns something
	#then = $derived.by(() => {
		const p = this.#promise;
		this.#overrides.length;

		return async (resolve, reject) => {
			try {
				await p;
				// we need this to avoid await_reactivity_loss warning and be in sync with other async reactivity
				// TODO still true?
				await wait();
				resolve?.(/** @type {T} */ (this.#current));
			} catch (error) {
				reject?.(error);
			}
		};
	});

	/**
	 * @param {() => Promise<T>} fn
	 */
	constructor(fn) {
		let init = false;
		this.#fn = () => {
			// Prevent state_unsafe_mutation error on first run when the resource is created within the template
			if (init) {
				this.#loading = true;
			} else {
				init = true;
			}

			// Don't use Promise.withResolvers, it's too new still
			/** @type {() => void} */
			let resolve;
			/** @type {(e?: any) => void} */
			let reject;
			/** @type {Promise<void>} */
			const promise = new Promise((res, rej) => {
				resolve = res;
				reject = rej;
			});

			this.#latest.push(
				// @ts-expect-error it's defined at this point
				resolve
			);

			Promise.resolve(fn())
				.then((value) => {
					// Skip the response if resource was refreshed with a later promise while we were waiting for this one to resolve
					const idx = this.#latest.indexOf(resolve);
					if (idx === -1) return;

					this.#latest.splice(0, idx).forEach((r) => r());
					this.#inited = true;
					this.#loading = false;
					this.#raw = value;

					resolve();
				})
				.catch((e) => reject(e));

			return promise;
		};

		this.#promise = $state.raw(this.#fn());
	}

	get then() {
		return this.#then;
	}

	get catch() {
		this.#then;
		return (/** @type {any} */ reject) => {
			return this.#then(undefined, reject);
		};
	}

	get finally() {
		this.#then;
		return (/** @type {any} */ fn) => {
			return this.#then(
				() => fn(),
				() => fn()
			);
		};
	}

	get current() {
		return this.#current;
	}

	get pending() {
		return this.#loading;
	}

	/**
	 * @param {(old: T) => T} fn
	 * @returns {() => void}
	 */
	override(fn) {
		this.#overrides.push(fn);

		return () => {
			const i = this.#overrides.indexOf(fn);

			if (i !== -1) {
				this.#overrides.splice(i, 1);
			}
		};
	}

	/**
	 * @returns {Promise<void>}
	 */
	refresh() {
		return (this.#promise = this.#fn());
	}
}

/**
 * @template T
 * @extends {Resource<T>}
 */
class Query extends Resource {
	/** @type {string} */
	_key;

	/**
	 * @param {string} key
	 * @param {() => Promise<T>} fn
	 */
	constructor(key, fn) {
		super(fn);
		this._key = key;
	}

	/**
	 * @param {(old: T) => T} fn
	 */
	withOverride(fn) {
		return {
			_key: this._key,
			release: this.override(fn)
		};
	}
}

/**
 * Client-version of the `query`/`prerender`/`cache` function from `$app/server`.
 * @param {string} id
 * @param {boolean} prerender
 * @returns {RemoteQuery<any, any>}
 */
function remote_request(id, prerender) {
	/** @type {unknown} */
	let cached_value = undefined;

	/** @type {RemoteQuery<any, any>} */
	const fn = (/** @type {any} */ arg) => {
		const stringified_args = stringify_remote_arg(arg, app.hooks.transport);
		const cache_key = create_remote_cache_key(id, stringified_args);
		let entry = result_map.get(cache_key);

		let tracking = true;
		try {
			$effect.pre(() => {
				if (entry) entry[0]++;
				return () => {
					const entry = result_map.get(cache_key);
					if (entry) {
						entry[0]--;
						void wait().then(() => {
							if (!entry[0] && entry === result_map.get(cache_key)) {
								result_map.delete(cache_key);
							}
						});
					}
				};
			});
		} catch {
			tracking = false;
		}

		let resource = entry?.[1];
		if (!resource) {
			resource = new Query(cache_key, async () => {
				if (!started) {
					const result = remote_responses[cache_key];
					if (result) {
						return result;
					}
				}

				if (cached_value !== undefined) {
					const v = cached_value;
					cached_value = undefined;
					return v;
				}

				const url = `/${app_dir}/remote/${id}${stringified_args ? (prerender ? `/${stringified_args}` : `?args=${stringified_args}`) : ''}`;
				const response = await fetch(url);
				if (!response.ok) {
					throw new HttpError(500, 'Failed to execute remote function');
				}

				const result = /** @type { RemoteFunctionResponse } */ (await response.json());
				if (result.type === 'redirect') {
					// resource_cache.delete(cache_key);
					// version++;
					// await goto(result.location);
					// /** @type {Resource<any>} */ (resource).refresh();
					// TODO double-check this
					await goto(result.location);
					await new Promise((r) => setTimeout(r, 100));
					throw new Redirect(307, result.location);
				} else if (result.type === 'error') {
					throw new HttpError(result.status ?? 500, result.error);
				} else {
					return devalue.parse(result.result, app.decoders);
				}
			});

			Object.defineProperty(resource, '_key', {
				value: cache_key,
				enumerable: false
			});

			result_map.set(
				cache_key,
				(entry = [
					tracking ? 1 : 0,
					resource,
					(v) => {
						cached_value = v;
						resource.refresh();
					}
				])
			);

			resource
				.then(() => {
					void wait().then(() => {
						if (!(/** @type {any} */ (entry)[0]) && entry === result_map.get(cache_key)) {
							// If no one is tracking this resource anymore, we can delete it from the cache
							result_map.delete(cache_key);
						}
					});
				})
				.catch(() => {
					// error delete the resource from the cache
					// TODO is that correct?
					result_map.delete(cache_key);
				});
		}

		return resource;
	};

	refresh_map.set(id, () => {
		for (const key of result_map.keys()) {
			if (key.startsWith(id + '|')) {
				result_map.get(key)?.[1].refresh();
			}
		}
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
	// Careful: This function MUST be synchronous (can't use the async keyword) because the return type has to be a promise with an updates() method.
	// If we make it async, the return type will be a promise that resolves to a promise with an updates() method, which is not what we want.
	return (/** @type {any} */ arg) => {
		/** @type {Array<Query<any> | ReturnType<Query<any>['withOverride']>>} */
		let updates = [];

		const promise = (async () => {
			await Promise.resolve();

			const response = await fetch(`/${app_dir}/remote/${id}`, {
				method: 'POST',
				body: JSON.stringify({
					args: stringify_remote_arg(arg, app.hooks.transport),
					refreshes: updates.map((u) => u._key)
				}),
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
				refresh_queries(result.refreshes, updates);

				return devalue.parse(result.result, app.decoders);
			}
		})();

		// @ts-expect-error
		promise.updates = (/** @type {any} */ ...args) => {
			updates = args;
			return promise;
		};

		return promise;
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
		const action_id = id + (key != undefined ? `/${JSON.stringify(key)}` : '');
		const action = '?/remote=' + encodeURIComponent(action_id);

		/** @type {any} */
		let result = $state(
			!started ? (remote_responses[create_remote_cache_key(action, '')] ?? undefined) : undefined
		);
		/** @type {any} */
		let error = $state(undefined);

		// Careful: This function MUST be synchronous (can't use the async keyword) because the return type has to be a promise with an updates() method.
		// If we make it async, the return type will be a promise that resolves to a promise with an updates() method, which is not what we want.
		/** @param {FormData} data */
		function submit(data) {
			// Store a reference to the current instance and increment the usage count for the duration
			// of the request. This ensures that the instance is not deleted in case of an optimistic update
			// (e.g. when deleting an item in a list) that fails and wants to surface an error to the user afterwards.
			// If the instance would be deleted in the meantime, the error property would be assigned to the old,
			// no-longer-visible instance, so it would never be shown to the user.
			const entry = instance_cache.get(key);
			if (entry) {
				entry[0]++;
			}

			/** @type {Array<Query<any> | ReturnType<Query<any>['withOverride']>>} */
			let updates = [];

			/** @type {Promise<any> & { updates: (...args: any[]) => any }} */
			const promise = (async () => {
				try {
					await Promise.resolve();

					if (updates.length > 0) {
						data.set('sveltekit:remote_refreshes', JSON.stringify(updates.map((u) => u._key)));
					}

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

						refresh_queries(form_result.refreshes, updates);
					} else if (form_result.type === 'redirect') {
						const refreshes = form_result.refreshes ?? '';
						const invalidateAll = !!refreshes;
						if (!invalidateAll) {
							refresh_queries(refreshes, updates);
						}
						void goto(form_result.location, { invalidateAll });
					} else {
						result = undefined;
						error = form_result.error;
						throw new HttpError(500, error);
					}
				} finally {
					// TODO find out why we need 9 and not just 3
					void wait(9).then(() => {
						if (entry) {
							entry[0]--;
							if (entry[0] === 0) {
								instance_cache.delete(key);
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

		/** @param {() => Promise<void>} submit */
		function default_submit(submit) {
			submit().catch((e) => {
				const error = e instanceof HttpError ? e.body : { message: e.message };
				const status = e instanceof HttpError ? e.status : 500;
				void set_nearest_error_page(error, status);
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
			return (event) => {
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
			return (event) => {
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

		if (key == undefined) {
			Object.defineProperty(submit, 'for', {
				/** @type {RemoteFormAction<any, any>['for']} */
				value: (key) => {
					let entry = instance_cache.get(key);

					let tracking = true;
					try {
						$effect.pre(() => {
							return () => {
								entry[0]--;
								void wait().then(() => {
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
 * @param {string} stringified_refreshes
 * @param {Array<Query<any> | ReturnType<Query<any>['withOverride']>>} updates
 */
function refresh_queries(stringified_refreshes, updates = []) {
	const refreshes = Object.entries(devalue.parse(stringified_refreshes, app.decoders));
	if (refreshes.length > 0) {
		for (const [key, value] of refreshes) {
			// If there was an optimistic update, release it right before we update the query
			const update = updates.find((u) => u._key === key);
			if (update && 'release' in update) {
				update.release();
			}
			// Update the query with the new value
			const entry = result_map.get(key);
			entry?.[2](value);
		}
	} else {
		void invalidateAll();
	}
}
