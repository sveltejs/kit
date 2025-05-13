/** @import { RemoteFormAction, RemoteQuery } from '@sveltejs/kit' */
/** @import { PrerenderEntryGenerator, RemoteInfo, ServerHooks } from 'types' */

import { stringify, uneval, parse } from 'devalue';
import { getRequestEvent } from './event.js';
import { stringify_rpc_response } from '../../server/remote/index.js';
import { json } from '../../../exports/index.js';
import { app_dir } from '__sveltekit/paths';
import { DEV } from 'esm-env';

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
 * @template {(formData: FormData) => any} T
 * @param {T} fn
 * @returns {RemoteFormAction<T>}
 */
export function form(fn) {
	/** @param {FormData} form_data */
	const wrapper = async (form_data) => {
		// TODO don't do the additional work when we're being called from the client?
		const event = getRequestEvent();
		const result = await fn(form_data);
		event._.remote_results[wrapper.action] = uneval_remote_response(result, event._.transport);
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
				return event._.remote_results[wrapper.action] ?? null;
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
	/**
	 * @param {Input} args
	 * @returns {Promise<Awaited<Output>>}
	 */
	const wrapper = async (...args) => {
		// TODO don't do the additional work when we're being called from the client?
		const event = getRequestEvent();
		const result = await fn(...args);
		const stringified_args = stringify(args, event._.transport);
		event._.remote_results[wrapper.__.id + stringified_args] = uneval_remote_response(
			result,
			event._.transport
		);
		if (event._.remote_prerendering) {
			const body = stringify_rpc_response(result, event._.transport);
			// TODO for prerendering we need to make the query args part of the pathname
			event._.remote_prerendering.dependencies.set(`/${app_dir}/remote/${wrapper.__.id}`, {
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
export function uneval_remote_response(data, transport) {
	const replacer = (/** @type {any} */ thing) => {
		for (const key in transport) {
			const encoded = transport[key].encode(thing);
			if (encoded) {
				return `app.decode('${key}', ${uneval(encoded, replacer)})`;
			}
		}
	};

	// TODO try_serialize
	return uneval(data, replacer);
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
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @returns {T}
 */
export function command(fn) {
	/** @type {any} */ (fn).__ = /** @type {RemoteInfo} */ ({
		type: 'command'
	});
	return fn;
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
 * @param {{ entries?: PrerenderEntryGenerator }} entries
 * @returns {RemoteQuery<Input, Output>}
 */
export function prerender(fn, { entries } = {}) {
	/**
	 * @param {Input} args
	 * @returns {Promise<Awaited<Output>>}
	 */
	const wrapper = async (...args) => {
		// TODO deduplicate this with query/cache
		const event = getRequestEvent();
		const result = await fn(...args);
		const stringified_args = stringify(args, event._.transport);
		event._.remote_results[wrapper.__.id + stringified_args] = uneval_remote_response(
			result,
			event._.transport
		);
		if (event._.remote_prerendering) {
			const body = stringify_rpc_response(result, event._.transport);
			// TODO for prerendering we need to make the query args part of the pathname
			event._.remote_prerendering.dependencies.set(`/${app_dir}/remote/${wrapper.__.id}`, {
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

/**
 * Creates a cached remote function. The cache duration is set through the `expiration` property of the `config` object.
 * ```ts
 * import { blogPosts } from '$lib/server/db';
 *
 * export const blogPosts = cache(
 * 	() => blogPosts.getAll(),
 * 	// cache for 60 seconds
 * 	{ expiration: 60 }
 * );
 * ```
 * The cache is deployment provider-specific; some providers may not support it. Consult your adapter's documentation for details.
 *
 * @template {any[]} Input
 * @template Output
 * @param {(...args: Input) => Output} fn
 * @param {Record<string, any>} config
 * @returns {RemoteQuery<Input, Output>}
 */
export function cache(fn, config) {
	/**
	 * @param {Input} args
	 * @returns {Promise<Awaited<Output>>}
	 */
	const wrapper = async (...args) => {
		// TODO deduplicate this with query/prerender
		const event = getRequestEvent();
		const stringified_args = stringify(args, event._.transport);

		let result;
		const is_cached = wrapper.cache.has(stringified_args);
		if (is_cached) {
			// TODO brings back stringified which we need to decode but thats stupid because we decode and stringify right away again
			result = parse_remote_response(wrapper.cache.get(stringified_args), event._.transport);
		} else {
			result = await fn(...args);
		}

		event._.remote_results[wrapper.__.id + stringified_args] = uneval_remote_response(
			result,
			event._.transport
		);

		if (event._.remote_prerendering) {
			const body = stringify_rpc_response(result, event._.transport);
			// TODO for prerendering we need to make the query args part of the pathname
			event._.remote_prerendering.dependencies.set(`/${app_dir}/remote/${wrapper.__.id}`, {
				body,
				response: json(body)
			});
		} else if (!is_cached) {
			const body = stringify_rpc_response(result, event._.transport);
			wrapper.cache.set(stringified_args, body);
		}
		return result;
	};

	if (DEV) {
		// In memory cache
		/** @type {Record<string, string>} */
		const cached = {};
		wrapper.cache = {
			get(input) {
				return cached[input];
			},
			has(input) {
				return input in cached;
			},
			set(input, output) {
				cached[input] = output;
				if (typeof wrapper.__.config.expiration === 'number') {
					setTimeout(() => {
						delete cached[input];
					}, wrapper.__.config.expiration * 1000);
				}
			},
			delete(input) {
				delete cached[input];
			}
		};
	} else {
		wrapper.cache = {
			// TODO warn somehow when adapter does not support cache?
			get() {},
			has() {
				return false;
			},
			set() {},
			delete() {}
		};
	}

	/** @type {RemoteQuery<any, any>['refresh']} */
	wrapper.refresh = (...args) => {
		// TODO is this agnostic enough / fine to require people calling this during a request event?
		const event = getRequestEvent();
		// TODO what about the arguments? are they required? we would need to have a way to know all the variants of a cached function
		wrapper.cache.delete(stringify(args, event._.transport));
	};

	wrapper.override = () => {
		throw new Error('Cannot call override on the server');
	};

	Object.defineProperty(wrapper, '__', {
		value: /** @type {RemoteInfo} */ ({ type: 'cache', id: '', config }),
		writable: false,
		enumerable: true,
		configurable: false
	});

	return wrapper;
}
