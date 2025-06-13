/** @import { RemoteFormAction, RemoteQuery, RequestEvent, ActionFailure as IActionFailure } from '@sveltejs/kit' */
/** @import { RemotePrerenderEntryGenerator, RemoteInfo, ServerHooks, MaybePromise } from 'types' */

import { uneval, parse } from 'devalue';
import { getRequestEvent, with_event } from './event.js';
import { get_remote_info } from '../../server/remote.js';
import { json } from '../../../exports/index.js';
import { DEV } from 'esm-env';
import { create_remote_cache_key, stringify, stringify_remote_args } from '../../shared.js';
import { prerendering } from '__sveltekit/environment';
import { app_dir, base } from '__sveltekit/paths';
import { ActionFailure } from '../../control.js';

/**
 * Creates a remote function that can be invoked like a regular function within components.
 * The given function is invoked directly on the backend and via a fetch call on the client.
 * ```ts
 * import { blogPosts } from '$lib/server/db';
 *
 * export const blogPosts = query(() => blogPosts.getAll());
 * ```
 * ```svelte
 * <script>
 *   import { blogPosts } from './blog.remote.js';
 * </script>
 *
 * {#await blogPosts() then posts}
 *   <!-- ... -->
 * {/await}
 * ```
 *
 * @template {any[]} Input
 * @template Output
 * @param {(...args: Input) => Output} fn
 * @returns {RemoteQuery<Input, Output>}
 */
/*@__NO_SIDE_EFFECTS__*/
export function query(fn) {
	check_experimental('query');

	/** @type {RemoteQuery<Input, Output>} */
	const wrapper = (...args) => {
		/** @type {Partial<ReturnType<RemoteQuery<Input, Output>>>} */
		const promise = new Promise(async (resolve, reject) => {
			if (prerendering) {
				throw new Error(
					'Cannot call query() from $app/server while prerendering, as prerendered pages need static data. Use prerender() instead'
				);
			}

			// TODO don't do the additional work when we're being called from the client?
			const event = getRequestEvent();
			try {
				const result = await get_response(
					/** @type {RemoteInfo} */ (/** @type {any} */ (wrapper).__).id,
					args,
					event,
					() => with_cleansed_event(event, false, () => fn(...args))
				);
				return resolve(result);
			} catch (e) {
				reject(e);
			}
		});

		promise.refresh = async () => {
			const event = getRequestEvent();
			const info = get_remote_info(event);
			const refreshes = info.refreshes;
			if (!refreshes) {
				throw new Error(
					'Cannot call refresh on a query that is not executed in the context of a command/form remote function'
				);
			}

			refreshes[
				create_remote_cache_key(
					/** @type {RemoteInfo} */ (/** @type {any} */ (wrapper).__).id,
					stringify_remote_args(args, info.transport)
				)
			] = await /** @type {Promise<any>} */ (promise);
		};

		promise.override = () => {
			throw new Error('Cannot call override on the server');
		};

		return /** @type {ReturnType<RemoteQuery<Input, Output>>} */ (promise);
	};

	Object.defineProperty(wrapper, '__', {
		value: /** @type {RemoteInfo} */ ({ type: 'query', id: '' }),
		writable: false,
		enumerable: false,
		configurable: false
	});

	return wrapper;
}

/**
 * Creates a prerendered remote function. The given function is invoked at build time and the result is stored to disk.
 * ```ts
 * import { blogPosts } from '$lib/server/db';
 *
 * export const blogPosts = prerender(() => blogPosts.getAll());
 * ```
 *
 * In case your function has arguments, you need to provide an `entries` function that returns a list of arrays representing the arguments to be used for prerendering.
 * ```ts
 * import { blogPosts } from '$lib/server/db';
 *
 * export const blogPost = prerender(
 * 	(id: string) => blogPosts.get(id),
 * 	{ entries: () => blogPosts.getAll().map((post) => ([post.id])) }
 * );
 * ```
 *
 * @template {any[]} Input
 * @template Output
 * @param {(...args: Input) => Output} fn
 * @param {{ entries?: RemotePrerenderEntryGenerator<Input>, dynamic?: boolean }} [options]
 * @returns {RemoteQuery<Input, Output>}
 */
/*@__NO_SIDE_EFFECTS__*/
export function prerender(fn, options) {
	check_experimental('prerender');

	/** @type {RemoteQuery<Input, Output>} */
	const wrapper = (...args) => {
		/** @type {Partial<ReturnType<RemoteQuery<Input, Output>>>} */
		const promise = new Promise(async (resolve) => {
			const event = getRequestEvent();
			const info = get_remote_info(event);
			const stringified_args = stringify_remote_args(args, info.transport);
			const id = /** @type {RemoteInfo} */ (/** @type {any} */ (wrapper).__).id;
			const url = `${base}/${app_dir}/remote/${id}/${stringified_args}`;

			if (!info.prerendering && !DEV && !event.isRemoteRequest) {
				try {
					return await get_response(id, args, event, async () => {
						const response = await fetch(event.url.origin + url);
						if (!response.ok) {
							throw new Error('Prerendered response not found');
						}
						const prerendered = await response.json();
						info.results[create_remote_cache_key(id, stringified_args)] = prerendered.result;
						return resolve(parse_remote_response(prerendered.result, info.transport));
					});
				} catch (e) {
					// not available prerendered, fallback to normal function
				}
			}

			if (info.prerendering?.remote_responses.has(url)) {
				return resolve(/** @type {Promise<any>} */ (info.prerendering.remote_responses.get(url)));
			}

			const maybe_promise = get_response(id, args, event, () =>
				with_cleansed_event(event, false, () => fn(...args))
			);

			if (info.prerendering) {
				info.prerendering.remote_responses.set(url, Promise.resolve(maybe_promise));
				Promise.resolve(maybe_promise).catch(() => info.prerendering?.remote_responses.delete(url));
			}

			const result = await maybe_promise;

			if (info.prerendering) {
				const body = { type: 'result', result: stringify(result, info.transport) };
				info.prerendering.dependencies.set(url, {
					body: JSON.stringify(body),
					response: json(body)
				});
			}

			return resolve(result);
		});

		promise.refresh = async () => {
			if (!options?.dynamic) {
				console.warn(
					'Calling refresh on a prerendered function that is not dynamic will not have any effect'
				);
			}

			const event = getRequestEvent();
			const info = get_remote_info(event);
			const refreshes = info.refreshes;
			if (!refreshes) {
				throw new Error(
					'Cannot call refresh on a prerender function that is not executed in the context of a command/form remote function'
				);
			}

			refreshes[
				create_remote_cache_key(
					/** @type {RemoteInfo} */ (/** @type {any} */ (wrapper).__).id,
					stringify_remote_args(args, info.transport)
				)
			] = await /** @type {Promise<any>} */ (promise);
		};

		promise.override = () => {
			throw new Error('Cannot call override on the server');
		};

		return /** @type {ReturnType<RemoteQuery<Input, Output>>} */ (promise);
	};

	Object.defineProperty(wrapper, '__', {
		value: /** @type {RemoteInfo} */ ({
			type: 'prerender',
			id: '',
			entries: options?.entries,
			dynamic: options?.dynamic
		}),
		configurable: false,
		writable: false,
		enumerable: false
	});

	return wrapper;
}

// TODO decide how we wanna shape this API, until then commented out
// /**
//  * Creates a cached remote function. The cache duration is set through the `expiration` property of the `config` object.
//  * ```ts
//  * import { blogPosts } from '$lib/server/db';
//  *
//  * export const blogPosts = cache(
//  * 	() => blogPosts.getAll(),
//  * 	// cache for 60 seconds
//  * 	{ expiration: 60 }
//  * );
//  * ```
//  * The cache is deployment provider-specific; some providers may not support it. Consult your adapter's documentation for details.
//  *
//  * @template {any[]} Input
//  * @template Output
//  * @param {(...args: Input) => Output} fn
//  * @param {{expiration: number } & Record<string, any>} config
//  * @returns {RemoteQuery<Input, Output>}
//  */
// export function cache(fn, config) {
// 	/**
// 	 * @param {Input} args
// 	 * @returns {Promise<Awaited<Output>>}
// 	 */
// 	const wrapper = async (...args) => {
// 		if (prerendering) {
// 			throw new Error(
// 				'Cannot call cache() from $app/server while prerendering, as prerendered pages need static data. Use prerender() instead'
// 			);
// 		}

// 		const event = getRequestEvent();
// 		const info = get_remote_info(event);
// 		const stringified_args = stringify_remote_args(args, info.transport);
// 		const cached = await wrapper.cache.get(stringified_args);

// 		if (typeof cached === 'string') {
// 			if (!event.isRemoteRequest) {
// 				info.results[stringified_args] = cached;
// 			}
// 			// TODO in case of a remote request we will stringify the result again right aftewards - save the work somehow?
// 			return parse_remote_response(cached, info.transport);
// 		} else {
// 			const result = await fn(...args);
// 			uneval_remote_response(wrapper.__.id, args, result, event);
// 			await wrapper.cache.set(stringified_args, stringify(result, info.transport));
// 			return result;
// 		}
// 	};

// 	/** @type {{ get(input: string): MaybePromise<any>; set(input:string, output: string): MaybePromise<void>; delete(input:string): MaybePromise<void> }} */
// 	let cache = {
// 		// TODO warn somehow when adapter does not support cache?
// 		get() {},
// 		set() {},
// 		delete() {}
// 	};

// 	if (DEV) {
// 		// In memory cache
// 		/** @type {Record<string, string>} */
// 		const cached = {};
// 		cache = {
// 			get(input) {
// 				return cached[input];
// 			},
// 			set(input, output) {
// 				const config = /** @type {RemoteInfo & { type: 'cache' }} */ (wrapper.__).config;
// 				cached[input] = output;
// 				if (typeof config.expiration === 'number') {
// 					setTimeout(() => {
// 						delete cached[input];
// 					}, config.expiration * 1000);
// 				}
// 			},
// 			delete(input) {
// 				delete cached[input];
// 			}
// 		};
// 	}

// 	wrapper.cache = cache;

// 	/** @type {RemoteQuery<any, any>['refresh']} */
// 	wrapper.refresh = (...args) => {
// 		// TODO is this agnostic enough / fine to require people calling this during a request event?
// 		const info = get_remote_info(getRequestEvent());
// 		// TODO what about the arguments? are they required? we would need to have a way to know all the variants of a cached function
// 		wrapper.cache.delete(stringify_remote_args(args, info.transport));
// 	};

// 	wrapper.override = () => {
// 		throw new Error('Cannot call override on the server');
// 	};

// 	Object.defineProperty(wrapper, '__', {
// 		value: /** @type {RemoteInfo} */ ({ type: 'cache', id: '', config }),
// 		writable: false,
// 		enumerable: true,
// 		configurable: false
// 	});

// 	return wrapper;
// }

/**
 * Creates a remote command. The given function is invoked directly on the server and via a fetch call on the client.
 *
 * ```ts
 * import { blogPosts } from '$lib/server/db';
 *
 * export interface BlogPost {
 * 	id: string;
 * 	title: string;
 * 	content: string;
 * }
 *
 * export const like = command((postId: string) => {
 * 	blogPosts.get(postId).like();
 * });
 * ```
 *
 * ```svelte
 * <script lang="ts">
 * 	import { like } from './blog.remote.js';
 *
 * 	let post: BlogPost = $props();
 * </script>
 *
 * <h1>{post.title}</h1>
 * <p>{post.content}</p>
 * <button onclick={() => like(post.id)}>♡</button>
 * ```
 *
 * @template {any[]} Input
 * @template Output
 * @param {(...args: Input) => Output} fn
 * @returns {(...args: Input) => Promise<Awaited<Output>>}
 */
/*@__NO_SIDE_EFFECTS__*/
export function command(fn) {
	check_experimental('command');

	/**
	 * @param {Input} args
	 * @returns {Promise<Awaited<Output>>}
	 */
	const wrapper = async (...args) => {
		if (prerendering) {
			throw new Error(
				'Cannot call command() from $app/server while prerendering, as prerendered pages need static data. Use prerender() instead'
			);
		}

		const event = getRequestEvent();

		if (!event.isRemoteRequest) {
			throw new Error(
				'Cannot call command() from $app/server during server side rendering. The only callable remote functions are query() and prerender().'
			);
		}

		if (!get_remote_info(event).refreshes) {
			get_remote_info(event).refreshes = {};
		}
		return /** @type {Awaited<Output>} */ (with_cleansed_event(event, true, () => fn(...args)));
	};

	/** @type {any} */ (wrapper).__ = /** @type {RemoteInfo} */ ({
		type: 'command'
	});

	return wrapper;
}

/**
 * Creates a form action. The passed function will be called when the form is submitted.
 * Returns an object that can be spread onto a form element to connect it to the function.
 * ```ts
 * import { createPost } from '$lib/server/db';
 *
 * export const createPost = form((formData) => {
 * 	const title = formData.get('title');
 * 	const content = formData.get('content');
 * 	return createPost({ title, content });
 * });
 * ```
 * ```svelte
 * <script>
 * 	import { createPost } from './blog.remote.js';
 * </script>
 *
 * <form {...createPost}>
 * 	<input type="text" name="title" />
 * 	<textarea name="content" />
 * 	<button type="submit">Create</button>
 * </form>
 * ```
 *
 * @template T
 * @template [U=never]
 * @param {(formData: FormData) => T | IActionFailure<U>} fn
 * @returns {RemoteFormAction<T, U>}
 */
/*@__NO_SIDE_EFFECTS__*/
export function form(fn) {
	check_experimental('form');

	/**
	 * @param {string | number | boolean} [key]
	 * @param {string} [action]
	 */
	function create_instance(key, action = '') {
		/** @param {FormData} form_data */
		const wrapper = async (form_data) => {
			if (prerendering) {
				throw new Error(
					'Cannot call form() from $app/server while prerendering, as prerendered pages need static data. Use prerender() instead'
				);
			}
			// TODO don't do the additional work when we're being called from the client?
			const event = getRequestEvent();
			const info = get_remote_info(event);

			if (!info.refreshes) {
				info.refreshes = {};
			}

			const result = await with_cleansed_event(event, true, () => fn(form_data));

			// We don't need to care about args or deduplicating calls, because uneval results are only relevant in full page reloads
			// where only one form submission is active at the same time
			if (!event.isRemoteRequest) {
				const normalized = result instanceof ActionFailure ? result.data : result;
				uneval_result(wrapper.action, [], event, normalized);
				info.form_result = [key, normalized];
			}

			return result;
		};

		wrapper.method = /** @type {'POST'} */ ('POST');
		wrapper.action = action; // This will be set by generated server code on startup, and for nested instances by the `for` method it is set by the calling parent
		wrapper.onsubmit = () => {};

		Object.defineProperty(wrapper, 'enhance', {
			value: () => {
				return { action: wrapper.action, method: wrapper.method, onsubmit: wrapper.onsubmit };
			},
			writable: false,
			enumerable: false,
			configurable: false
		});

		const form_action = {
			type: 'submit',
			formaction: action,
			onclick: () => {}
		};
		Object.defineProperty(form_action, 'enhance', {
			value: () => {
				return { type: 'submit', formaction: wrapper.formAction.formaction, onclick: () => {} };
			},
			writable: false,
			enumerable: false,
			configurable: false
		});
		Object.defineProperty(wrapper, 'formAction', {
			value: form_action,
			writable: false,
			enumerable: false,
			configurable: false
		});

		Object.defineProperty(wrapper, '__', {
			value: /** @type {RemoteInfo} */ ({
				type: 'form',
				id: 'unused for forms',
				// This allows us to deduplicate some logic at the callsites
				set_action: (action) => {
					wrapper.action = `?/remote=${encodeURIComponent(action)}`;
					wrapper.formAction.formaction = `?/remote=${encodeURIComponent(action)}`;
				}
			}),
			writable: false,
			enumerable: false,
			configurable: false
		});

		Object.defineProperty(wrapper, 'result', {
			get() {
				try {
					const info = get_remote_info(getRequestEvent());
					return info.form_result && info.form_result[0] === key ? info.form_result[1] : undefined;
				} catch (e) {
					return undefined;
				}
			},
			enumerable: false,
			configurable: false
		});

		Object.defineProperty(wrapper, 'error', {
			get() {
				// When a form post fails on the server the nearest error page will be rendered instead, so we don't need this
				return /** @type {any} */ (null);
			},
			enumerable: false,
			configurable: false
		});

		if (key == undefined) {
			Object.defineProperty(wrapper, 'for', {
				/** @type {RemoteFormAction<any, any>['for']} */
				value: (key) => {
					const info = get_remote_info(getRequestEvent());
					let entry = info.form_instances.get(key);

					if (!entry) {
						info.form_instances.set(
							key,
							(entry = create_instance(
								key,
								wrapper.action + encodeURIComponent(`/${JSON.stringify(key)}`)
							))
						);
					}

					return entry;
				}
			});
		}

		return wrapper;
	}

	// @ts-expect-error TS doesn't get the types right
	return create_instance();
}

/**
 * In case of a single remote function call, just returns the result.
 *
 * In case of a full page reload, returns the response for a remote function call,
 * either from the cache or by invoking the function.
 * Also saves an uneval'ed version of the result for later HTML inlining for hydration.
 *
 * @template {MaybePromise<any>} T
 * @param {string} id
 * @param {any[]} args
 * @param {RequestEvent} event
 * @param {() => T} get_result
 * @returns {T}
 */
function get_response(id, args, event, get_result) {
	const info = get_remote_info(event);

	// We only want to do this for full page visits where we can safely deduplicate calls (for remote calls we would have
	// to ensure they come from the same user) and have to stringify the result into the HTML
	if (event.isRemoteRequest) return get_result();

	const cache_key = create_remote_cache_key(id, stringify_remote_args(args, info.transport));

	if (!(cache_key in info.results)) {
		// TODO better error handling when promise rejects?
		info.results[cache_key] = Promise.resolve(get_result()).catch(() => {
			delete info.results[cache_key];
			return /** @type {any} */ (undefined);
		});

		uneval_result(id, args, event, info.results[cache_key], cache_key);
	}

	return /** @type {T} */ (info.results[cache_key]);
}

/**
 * @param {string} id
 * @param {any[]} args
 * @param {RequestEvent} event
 * @param {MaybePromise<any>} result
 * @param {string} [cache_key]
 */
function uneval_result(id, args, event, result, cache_key) {
	const info = get_remote_info(event);

	cache_key ||= create_remote_cache_key(id, stringify_remote_args(args, info.transport));

	if (!(cache_key in info.unevaled_results)) {
		const replacer = (/** @type {any} */ thing) => {
			for (const key in info.transport) {
				const encoded = info.transport[key].encode(thing);
				if (encoded) {
					return `app.decode('${key}', ${uneval(encoded, replacer)})`;
				}
			}
		};

		// TODO better error handling when promise rejects?
		info.unevaled_results[cache_key] = Promise.resolve(result)
			.then((result) => uneval(result, replacer))
			.catch(() => {
				delete info.unevaled_results[cache_key];
				return /** @type {any} */ (undefined);
			});
	}
}

/** @param {string} feature */
function check_experimental(feature) {
	if (!__SVELTEKIT_EXPERIMENTAL__REMOTE_FUNCTIONS__) {
		throw new Error(
			`Cannot use \`${feature}\` from \`$app/server\` without the experimental flag set to true. Please set kit.experimental.remoteFunctions to \`true\` in your config.`
		);
	}
}

/**
 * @param {any} data
 * @param {ServerHooks['transport']} transport
 */
function parse_remote_response(data, transport) {
	/** @type {Record<string, any>} */
	const revivers = {};
	for (const key in transport) {
		revivers[key] = transport[key].decode;
	}

	return parse(data, revivers);
}

/**
 * Like `with_event` but removes things from `event` you cannot see/call in remote functions, such as `setHeaders`.
 * @template T
 * @param {RequestEvent} event
 * @param {boolean} allow_cookies
 * @param {() => T} fn
 */
function with_cleansed_event(event, allow_cookies, fn) {
	/** @type {RequestEvent} */
	const cleansed = {
		...event,
		setHeaders: () => {
			throw new Error('setHeaders is not allowed in remote functions');
		},
		cookies: {
			get: event.cookies.get,
			getAll: event.cookies.getAll,
			serialize: event.cookies.serialize,
			set: (name, value, opts) => {
				if (allow_cookies) {
					if (opts.path && !opts.path.startsWith('/')) {
						throw new Error('Cookies set in remote functions must have an absolute path');
					}
					return event.cookies.set(name, value, opts);
				}
				throw new Error(
					'cookies.set is not allowed in remote functions other than command and form'
				);
			},
			delete: (name, opts) => {
				if (allow_cookies) {
					if (opts.path && !opts.path.startsWith('/')) {
						throw new Error('Cookies deleted in remote functions must have an absolute path');
					}
					return event.cookies.delete(name, opts);
				}
				throw new Error(
					'cookies.delete is not allowed in remote functions other than command and form'
				);
			}
		},
		route: { id: null },
		url: new URL(event.url.origin)
	};

	const symbols = Object.getOwnPropertySymbols(event);
	for (const symbol of symbols) {
		// @ts-expect-error there's remote info in the event object
		cleansed[symbol] = event[symbol];
	}

	return with_event(cleansed, fn);
}
