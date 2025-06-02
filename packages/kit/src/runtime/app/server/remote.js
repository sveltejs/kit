/** @import { RemoteFormAction, RemoteQuery, RequestEvent, ActionFailure as IActionFailure } from '@sveltejs/kit' */
/** @import { RemotePrerenderEntryGenerator, RemoteInfo, ServerHooks } from 'types' */

import { uneval, parse } from 'devalue';
import { getRequestEvent } from './event.js';
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
		const promise = new Promise(async (resolve) => {
			if (prerendering) {
				throw new Error(
					'Cannot call query() from $app/server while prerendering, as prerendered pages need static data. Use prerender() instead'
				);
			}

			// TODO don't do the additional work when we're being called from the client?
			const event = getRequestEvent();
			const result = await fn(...args);
			uneval_remote_response(
				/** @type {RemoteInfo} */ (/** @type {any} */ (wrapper).__).id,
				args,
				result,
				event
			);
			return resolve(result);
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
					const response = await fetch(event.url.origin + url);
					if (response.ok) {
						const prerendered = await response.json();
						info.results[create_remote_cache_key(id, stringified_args)] = prerendered.result;
						return resolve(parse_remote_response(prerendered.result, info.transport));
					}
				} catch (e) {
					// not available prerendered, fallback to normal function
				}
			}

			if (info.prerendering?.remote_responses.has(url)) {
				return resolve(/** @type {Promise<any>} */ (info.prerendering.remote_responses.get(url)));
			}

			const maybe_promise = fn(...args);

			if (info.prerendering) {
				info.prerendering.remote_responses.set(url, Promise.resolve(maybe_promise));
				Promise.resolve(maybe_promise).catch(() => info.prerendering?.remote_responses.delete(url));
			}

			const result = await maybe_promise;

			uneval_remote_response(id, args, result, event);

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
		return /** @type {Awaited<Output>} */ (fn(...args));
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

		const result = await fn(form_data);

		// We don't need to care about args, because uneval results are only relevant in full page reloads
		// where only one form submission is active at the same time
		if (!event.isRemoteRequest) {
			uneval_remote_response(
				wrapper.action,
				[],
				result instanceof ActionFailure ? result.data : result,
				event
			);
			info.form_result = result instanceof ActionFailure ? result.data : result;
		}

		return result;
	};

	wrapper.method = /** @type {'POST'} */ ('POST');
	wrapper.action = '';
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
		formaction: '',
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
				const event = getRequestEvent();
				return get_remote_info(event).form_result;
			} catch (e) {
				return null;
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

	// @ts-expect-error TS doesn't get the types right
	return wrapper;
}

/**
 * @param {string} id
 * @param {any[]} args
 * @param {any} result
 * @param {RequestEvent} event
 */
function uneval_remote_response(id, args, result, event) {
	const info = get_remote_info(event);

	// We only need to do this for full page visits where we stringify the result into the HTML
	if (event.isRemoteRequest) return;

	const cache_key = create_remote_cache_key(id, stringify_remote_args(args, info.transport));

	const replacer = (/** @type {any} */ thing) => {
		for (const key in info.transport) {
			const encoded = info.transport[key].encode(thing);
			if (encoded) {
				return `app.decode('${key}', ${uneval(encoded, replacer)})`;
			}
		}
	};

	// TODO better error when this fails?
	info.results[cache_key] = uneval(result, replacer);
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
