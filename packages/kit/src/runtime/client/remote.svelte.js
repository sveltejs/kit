/** @import { RemoteForm, RemoteQueryFunction, RemoteCommand } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */

import { app_dir } from '__sveltekit/paths';
import { version } from '__sveltekit/environment';
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
	query_map
} from './client.js';
import { create_remote_cache_key, stringify_remote_arg } from '../shared.js';
import { tick } from 'svelte';

// Initialize Cache API for prerender functions
const CACHE_NAME = `sveltekit:${version}`;
/** @type {Cache | undefined} */
let prerender_cache;

void (async () => {
	if (!DEV && typeof caches !== 'undefined') {
		try {
			prerender_cache = await caches.open(CACHE_NAME);

			// Clean up old cache versions
			const cache_names = await caches.keys();
			for (const cache_name of cache_names) {
				if (cache_name.startsWith('sveltekit:') && cache_name !== CACHE_NAME) {
					await caches.delete(cache_name);
				}
			}
		} catch (error) {
			console.warn('Failed to initialize SvelteKit cache:', error);
		}
	}
})();

/**
 * @template T
 * @implements {Partial<Promise<T>>}
 */
class Prerender {
	/** @type {Promise<T>} */
	#promise;

	#loading = $state(true);

	/** @type {T | undefined} */
	#current = $state.raw();

	#error = $state.raw(undefined);

	/**
	 * @param {() => Promise<T>} fn
	 */
	constructor(fn) {
		this.#promise = fn().then(
			(value) => {
				this.#loading = false;
				this.#current = value;
				return value;
			},
			(error) => {
				this.#loading = false;
				this.#error = error;
				throw error;
			}
		);
	}

	/**
	 *
	 * @param {((value: any) => any) | null | undefined} onfulfilled
	 * @param {((reason: any) => any) | null | undefined} [onrejected]
	 * @returns
	 */
	then(onfulfilled, onrejected) {
		return this.#promise.then(onfulfilled, onrejected);
	}

	/**
	 * @param {((reason: any) => any) | null | undefined} onrejected
	 */
	catch(onrejected) {
		return this.#promise.catch(onrejected);
	}

	/**
	 * @param {(() => any) | null | undefined} onfinally
	 */
	finally(onfinally) {
		return this.#promise.finally(onfinally);
	}

	get current() {
		return this.#current;
	}

	get error() {
		return this.#error;
	}

	/**
	 * Returns true if the resource is loading or reloading.
	 */
	get loading() {
		return this.#loading;
	}

	/**
	 * Returns the status of the resource:
	 * - 'loading': no value yet
	 * - 'success': got a value after a successful fetch
	 * - 'error': got an error after a fetch failed
	 */
	get status() {
		if (this.#loading) {
			return 'loading';
		} else if (this.#error !== undefined) {
			return 'error';
		} else {
			return 'success';
		}
	}
}

/**
 * @template T
 * @implements {Partial<Promise<T>>}
 */
class Query {
	/** @type {string} */
	_key;

	#init = false;
	/** @type {() => Promise<T>} */
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

	#error = $state.raw(undefined);

	/** @type {Promise<T>['then']} */
	// @ts-expect-error TS doesn't understand that the promise returns something
	#then = $derived.by(() => {
		const p = this.#promise;
		this.#overrides.length;

		return async (resolve, reject) => {
			try {
				await p;
				// svelte-ignore await_reactivity_loss
				await tick();
				resolve?.(/** @type {T} */ (this.#current));
			} catch (error) {
				reject?.(error);
			}
		};
	});

	/**
	 * @param {string} key
	 * @param {() => Promise<T>} fn
	 */
	constructor(key, fn) {
		this._key = key;
		this.#fn = fn;
		this.#promise = $state.raw(this.#run());
	}

	#run() {
		// Prevent state_unsafe_mutation error on first run when the resource is created within the template
		if (this.#init) {
			this.#loading = true;
		} else {
			this.#init = true;
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

		Promise.resolve(this.#fn())
			.then((value) => {
				// Skip the response if resource was refreshed with a later promise while we were waiting for this one to resolve
				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				this.#latest.splice(0, idx).forEach((r) => r());
				this.#inited = true;
				this.#loading = false;
				this.#raw = value;
				this.#error = undefined;

				resolve();
			})
			.catch((e) => {
				const idx = this.#latest.indexOf(resolve);
				if (idx === -1) return;

				this.#latest.splice(0, idx).forEach((r) => r());
				this.#error = e;
				this.#loading = false;
				reject(e);
			});

		return promise;
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

	get error() {
		return this.#error;
	}

	/**
	 * Returns true if the resource is loading or reloading.
	 */
	get loading() {
		return this.#loading;
	}

	/**
	 * Returns the status of the resource:
	 * - 'loading': no value yet
	 * - 'reloading': value, currently refetching
	 * - 'success': got a value after a successful fetch
	 * - 'error': got an error after a fetch failed
	 */
	get status() {
		if (this.#loading) {
			if (!this.#inited) {
				return 'loading';
			} else {
				return 'reloading';
			}
		} else if (this.#error !== undefined) {
			return 'error';
		} else if (this.#inited) {
			return 'success';
		} else {
			return 'loading';
		}
	}

	/**
	 * @returns {Promise<void>}
	 */
	refresh() {
		return (this.#promise = this.#run());
	}

	/**
	 * @param {T} value
	 */
	set(value) {
		this.#inited = true;
		this.#loading = false;
		this.#error = undefined;
		this.#raw = value;
		this.#promise = Promise.resolve();
	}

	/**
	 * @param {(old: T) => T} fn
	 */
	withOverride(fn) {
		this.#overrides.push(fn);

		return {
			_key: this._key,
			release: () => {
				const i = this.#overrides.indexOf(fn);

				if (i !== -1) {
					this.#overrides.splice(i, 1);
				}
			}
		};
	}
}

/**
 * Client-version of the `query`/`prerender`/`cache` function from `$app/server`.
 * @param {string} id
 * @param {(key: string, args: string) => any} create
 */
function create_remote_function(id, create) {
	return (/** @type {any} */ arg) => {
		const stringified_args = stringify_remote_arg(arg, app.hooks.transport);
		const cache_key = create_remote_cache_key(id, stringified_args);
		let entry = query_map.get(cache_key);

		let tracking = true;
		try {
			$effect.pre(() => {
				if (entry) entry.count++;
				return () => {
					const entry = query_map.get(cache_key);
					if (entry) {
						entry.count--;
						void tick().then(() => {
							if (!entry.count && entry === query_map.get(cache_key)) {
								query_map.delete(cache_key);
							}
						});
					}
				};
			});
		} catch {
			tracking = false;
		}

		let resource = entry?.resource;
		if (!resource) {
			resource = create(cache_key, stringified_args);

			Object.defineProperty(resource, '_key', {
				value: cache_key,
				enumerable: false
			});

			query_map.set(
				cache_key,
				(entry = {
					count: tracking ? 1 : 0,
					resource
				})
			);

			resource
				.then(() => {
					void tick().then(() => {
						if (
							!(/** @type {NonNullable<typeof entry>} */ (entry).count) &&
							entry === query_map.get(cache_key)
						) {
							// If no one is tracking this resource anymore, we can delete it from the cache
							query_map.delete(cache_key);
						}
					});
				})
				.catch(() => {
					// error delete the resource from the cache
					// TODO is that correct?
					query_map.delete(cache_key);
				});
		}

		return resource;
	};
}

/**
 *
 * @param {string} url
 */
async function remote_request(url) {
	const response = await fetch(url);

	if (!response.ok) {
		throw new HttpError(500, 'Failed to execute remote function');
	}

	const result = /** @type {RemoteFunctionResponse} */ (await response.json());

	if (result.type === 'redirect') {
		// resource_cache.delete(cache_key);
		// version++;
		// await goto(result.location);
		// /** @type {Query<any>} */ (resource).refresh();
		// TODO double-check this
		await goto(result.location);
		await new Promise((r) => setTimeout(r, 100));
		throw new Redirect(307, result.location);
	}

	if (result.type === 'error') {
		throw new HttpError(result.status ?? 500, result.error);
	}

	return devalue.parse(result.result, app.decoders);
}

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query(id) {
	return create_remote_function(id, (cache_key, stringified_args) => {
		return new Query(cache_key, async () => {
			if (!started) {
				const result = remote_responses[cache_key];
				if (result) {
					return result;
				}
			}

			const url = `/${app_dir}/remote/${id}${stringified_args ? `?args=${stringified_args}` : ''}`;

			return await remote_request(url);
		});
	});
}

/**
 * @param {string} id
 */
export function prerender(id) {
	return create_remote_function(id, (cache_key, stringified_args) => {
		return new Prerender(async () => {
			if (!started) {
				const result = remote_responses[cache_key];
				if (result) {
					return result;
				}
			}

			const url = `/${app_dir}/remote/${id}${stringified_args ? `/${stringified_args}` : ''}`;

			// Check the Cache API first
			if (prerender_cache) {
				try {
					const cached_response = await prerender_cache.match(url);
					if (cached_response) {
						const cached_result = /** @type { RemoteFunctionResponse & { type: 'result' } } */ (
							await cached_response.json()
						);
						return devalue.parse(cached_result.result, app.decoders);
					}
				} catch {
					// Nothing we can do here
				}
			}

			const result = await remote_request(url);

			// For successful prerender requests, save to cache
			if (prerender_cache) {
				try {
					await prerender_cache.put(
						url,
						// We need to create a new response because the original response is already consumed
						new Response(JSON.stringify(result), {
							headers: {
								'Content-Type': 'application/json'
							}
						})
					);
				} catch {
					// Nothing we can do here
				}
			}

			return result;
		});
	});
}

/**
 * Client-version of the `command` function from `$app/server`.
 * @param {string} id
 * @returns {RemoteCommand<any, any>}
 */
export function command(id) {
	// Careful: This function MUST be synchronous (can't use the async keyword) because the return type has to be a promise with an updates() method.
	// If we make it async, the return type will be a promise that resolves to a promise with an updates() method, which is not what we want.
	return (arg) => {
		/** @type {Array<Query<any> | ReturnType<Query<any>['withOverride']>>} */
		let updates = [];

		/** @type {Promise<any> & { updates: (...args: any[]) => any }} */
		const promise = (async () => {
			// Wait a tick to give room for the `updates` method to be called
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
				release_overrides(updates);
				// We only end up here in case of a network error or if the server has an internal error
				// (which shouldn't happen because we handle errors on the server and always send a 200 response)
				throw new Error('Failed to execute remote function');
			}

			const result = /** @type {RemoteFunctionResponse} */ (await response.json());
			if (result.type === 'redirect') {
				release_overrides(updates);
				throw new Error(
					'Redirects are not allowed in commands. Return a result instead and use goto on the client'
				);
			} else if (result.type === 'error') {
				release_overrides(updates);
				throw new HttpError(result.status ?? 500, result.error);
			} else {
				refresh_queries(result.refreshes, updates);

				return devalue.parse(result.result, app.decoders);
			}
		})();

		promise.updates = (/** @type {any} */ ...args) => {
			updates = args;
			// @ts-expect-error Don't allow updates to be called multiple times
			delete promise.updates;
			return promise;
		};

		return promise;
	};
}

/**
 * Client-version of the `form` function from `$app/server`.
 * @template T
 * @template U
 * @param {string} id
 * @returns {RemoteForm<T, U>}
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
			const entry = instance_cache.get(key);
			if (entry) {
				entry.count++;
			}

			/** @type {Array<Query<any> | ReturnType<Query<any>['withOverride']>>} */
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
						const invalidateAll = !refreshes && updates.length === 0;
						if (!invalidateAll) {
							refresh_queries(refreshes, updates);
						}
						void goto(form_result.location, { invalidateAll });
					} else {
						result = undefined;
						error = form_result.error;
						throw new HttpError(500, error);
					}
				} catch (e) {
					release_overrides(updates);
					throw e;
				} finally {
					void tick().then(() => {
						if (entry) {
							entry.count--;
							if (entry.count === 0) {
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

		/** @type {RemoteForm<T, U>} */
		const instance = {};

		instance.method = 'POST';
		instance.action = action;

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

		/** @param {Parameters<RemoteForm<any, any>['enhance']>[0]} callback */
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

		instance.onsubmit = form_onsubmit(({ submit }) => default_submit(submit));

		/** @param {Parameters<RemoteForm<any, any>['formAction']['enhance']>[0]} callback */
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

		/** @type {RemoteForm<any, any>['formAction']} */
		// @ts-expect-error we gotta set enhance as a non-enumerable property
		const form_action = {
			type: 'submit',
			formaction: action,
			onclick: form_action_onclick(({ submit }) => default_submit(submit))
		};

		Object.defineProperty(form_action, 'enhance', {
			/** @type {RemoteForm<any, any>['formAction']['enhance']} */
			value: (callback) => {
				return {
					type: 'submit',
					formaction: action,
					onclick: form_action_onclick(callback)
				};
			},
			enumerable: false
		});

		Object.defineProperties(instance, {
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
				/** @type {RemoteForm<any, any>['enhance']} */
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
			Object.defineProperty(instance, 'for', {
				/** @type {RemoteForm<any, any>['for']} */
				value: (key) => {
					let entry = instance_cache.get(key);

					let tracking = true;
					try {
						$effect.pre(() => {
							return () => {
								entry.count--;
								void tick().then(() => {
									if (entry.count === 0) {
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
							entry.count++;
						}
					} else if (!entry) {
						entry = [0, create_instance(key)];
					}

					return entry[1];
				},
				enumerable: false
			});
		}

		return instance;
	}

	return create_instance();
}

/**
 * @param {Array<Query<any> | ReturnType<Query<any>['withOverride']>>} updates
 */
function release_overrides(updates) {
	for (const update of updates) {
		if ('release' in update) {
			update.release();
		}
	}
}

/**
 * @param {string} stringified_refreshes
 * @param {Array<Query<any> | ReturnType<Query<any>['withOverride']>>} updates
 */
function refresh_queries(stringified_refreshes, updates = []) {
	const refreshes = Object.entries(devalue.parse(stringified_refreshes, app.decoders));
	if (refreshes.length > 0) {
		// `refreshes` is a superset of `updates`
		for (const [key, value] of refreshes) {
			// If there was an optimistic update, release it right before we update the query
			const update = updates.find((u) => u._key === key);
			if (update && 'release' in update) {
				update.release();
			}
			// Update the query with the new value
			const entry = query_map.get(key);
			entry?.resource.set(value);
		}
	} else {
		void invalidateAll();
	}
}
