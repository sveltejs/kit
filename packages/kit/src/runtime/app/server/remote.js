/** @import { RemoteFormAction, RemoteQuery, RequestEvent } from '@sveltejs/kit' */
/** @import { RemotePrerenderEntryGenerator, RemoteInfo, ServerHooks, MaybePromise } from 'types' */

import { uneval, parse } from 'devalue';
import { getRequestEvent } from './event.js';
import { get_remote_info } from '../../server/remote/index.js';
import { json } from '../../../exports/index.js';
import { DEV } from 'esm-env';
import { create_remote_cache_key, stringify, stringify_remote_args } from '../../shared.js';
import { prerendering } from '__sveltekit/environment';
import { app_dir, base } from '__sveltekit/paths';

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
 * @param {(formData: FormData) => T} fn
 * @returns {RemoteFormAction<T>}
 */
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
		const result = await fn(form_data);
		// We don't need to care about args, because uneval results are only relevant in full page reloads
		// where only one form submission is active at the same time
		uneval_remote_response(wrapper.action, [], result, event);
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
				return get_remote_info(event).results[create_remote_cache_key(wrapper.action, '')] ?? null;
			} catch (e) {
				return null;
			}
		},
		enumerable: false,
		configurable: false
	});

	// @ts-expect-error TS doesn't get the types right
	return wrapper;
}

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
export function query(fn) {
	check_experimental('query');

	/**
	 * @param {Input} args
	 * @returns {Promise<Awaited<Output>>}
	 */
	const wrapper = async (...args) => {
		if (prerendering) {
			throw new Error(
				'Cannot call query() from $app/server while prerendering, as prerendered pages need static data. Use prerender() instead'
			);
		}

		// TODO don't do the additional work when we're being called from the client?
		const event = getRequestEvent();
		const result = await fn(...args);
		uneval_remote_response(wrapper.__.id, args, result, event);
		return result;
	};

	wrapper.refresh = () => {
		throw new Error('Cannot call refresh on the server');
	};

	wrapper.override = () => {
		throw new Error('Cannot call override on the server');
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

		return /** @type {Awaited<Output>} */ (fn(...args));
	};

	/** @type {any} */ (wrapper).__ = /** @type {RemoteInfo} */ ({
		type: 'command'
	});

	return wrapper;
}

/**
 * Creates a pererendered remote function. The given function is invoked at build time and the result is stored to disk.
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
 * 	(id: string) => blogPosts.get(id)
 * 	{ entries: () => blogPosts.getAll().map((post) => ([post.id])) }
 * );
 * ```
 *
 * @template {any[]} Input
 * @template Output
 * @param {(...args: Input) => Output} fn
 * @param {{ entries?: RemotePrerenderEntryGenerator<Input> }} entries
 * @returns {RemoteQuery<Input, Output>}
 */
export function prerender(fn, { entries } = {}) {
	check_experimental('prerender');

	/**
	 * @param {Input} args
	 * @returns {Promise<Awaited<Output>>}
	 */
	const wrapper = async (...args) => {
		const event = getRequestEvent();
		const info = get_remote_info(event);
		const stringified_args = stringify_remote_args(args, info.transport);
		const url = `${base}/${app_dir}/remote/${wrapper.__.id}/${stringified_args}`;

		if (!info.prerendering && !DEV && !event.isRemoteRequest) {
			try {
				// We do a fetch request to ourselves which will return the prerendered response.
				// TODO make use of $app/server#read somehow?
				const response = await fetch(event.url.origin + url);
				if (response.ok) {
					const prerendered = await response.text();
					info.results[create_remote_cache_key(wrapper.__.id, stringified_args)] = prerendered;
					return parse_remote_response(prerendered, info.transport);
				}
			} catch (e) {
				// not available prerendered, fallback to normal function
			}
		}

		// Deduplicate function calls
		if (info.prerendering?.remote_responses.has(url)) {
			return info.prerendering.remote_responses.get(url);
		}

		const maybe_promise = fn(...args);

		if (info.prerendering) {
			info.prerendering.remote_responses.set(url, Promise.resolve(maybe_promise));
		}

		const result = await maybe_promise;

		uneval_remote_response(wrapper.__.id, args, result, event);

		if (info.prerendering) {
			const body = stringify(result, info.transport);
			info.prerendering.dependencies.set(url, {
				body,
				response: json(body)
			});
		}

		return result;
	};

	wrapper.refresh = () => {
		throw new Error('Cannot call refresh on the server');
	};

	wrapper.override = () => {
		throw new Error('Cannot call override on the server');
	};

	wrapper.__ = /** @type {RemoteInfo} */ ({
		type: 'prerender',
		id: '',
		entries: entries
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
