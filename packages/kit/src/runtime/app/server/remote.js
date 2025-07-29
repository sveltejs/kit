/** @import { RemoteForm, RemoteQuery, RemoteQueryFunction, RemoteResource, RemotePrerenderFunction, RemoteCommand, RequestEvent } from '@sveltejs/kit' */
/** @import { RemotePrerenderInputsGenerator, RemoteInfo, ServerHooks, MaybePromise } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */

import { uneval, parse } from 'devalue';
import { error, json } from '@sveltejs/kit';
import { DEV } from 'esm-env';
import { getRequestEvent, with_event } from './event.js';
import { get_remote_info } from '../../server/remote.js';
import { create_remote_cache_key, stringify, stringify_remote_arg } from '../../shared.js';
import { prerendering } from '__sveltekit/environment';
import { app_dir, base } from '__sveltekit/paths';

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
 * @template Output
 * @overload
 * @param {() => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<void, Output>}
 */
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
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<Input, Output>}
 */
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
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<StandardSchemaV1.InferOutput<Schema>, Output>}
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(args?: Input) => MaybePromise<Output>} [maybe_fn]
 * @returns {RemoteQueryFunction<Input, Output>}
 */
/*@__NO_SIDE_EFFECTS__*/
export function query(validate_or_fn, maybe_fn) {
	check_experimental('query');

	/** @type {(arg?: Input) => Output} */
	const fn = maybe_fn ?? validate_or_fn;
	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/** @type {RemoteQueryFunction<Input, Output> & { __: RemoteInfo }} */
	const wrapper = (arg) => {
		/** @type {Partial<RemoteQuery<any>>} */
		const promise = (async () => {
			if (prerendering) {
				throw new Error(
					`Cannot call query '${wrapper.__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
				);
			}

			// TODO don't do the additional work when we're being called from the client?
			const event = getRequestEvent();
			const result = await get_response(/** @type {RemoteInfo} */ (wrapper.__).id, arg, event, () =>
				run_remote_function(event, false, arg, validate, fn)
			);
			return result;
		})();

		promise.refresh = async () => {
			const event = getRequestEvent();
			const info = get_remote_info(event);
			const refreshes = info.refreshes;
			if (!refreshes) {
				throw new Error(
					`Cannot call refresh on query '${wrapper.__.name}' because it is not executed in the context of a command/form remote function`
				);
			}

			refreshes[
				create_remote_cache_key(
					/** @type {RemoteInfo} */ (wrapper.__).id,
					stringify_remote_arg(arg, info.transport)
				)
			] = await /** @type {Promise<any>} */ (promise);
		};

		promise.withOverride = () => {
			throw new Error(`Cannot call '${wrapper.__.name}.withOverride()' on the server`);
		};

		return /** @type {RemoteQuery<Output>} */ (promise);
	};

	Object.defineProperty(wrapper, '__', {
		value: /** @type {RemoteInfo} */ ({ type: 'query', id: '' })
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
 * In case your function has an argument, you need to provide an `inputs` function that returns a list representing the arguments to be used for prerendering.
 * ```ts
 * import z from 'zod';
 * import { blogPosts } from '$lib/server/db';
 *
 * export const blogPost = prerender(
 *  z.string(),
 * 	(id) => blogPosts.get(id),
 * 	{ inputs: () => blogPosts.getAll().map((post) => post.id) }
 * );
 * ```
 *
 * @template Output
 * @overload
 * @param {() => MaybePromise<Output>} fn
 * @param {{ inputs?: RemotePrerenderInputsGenerator<void>, dynamic?: boolean }} [options]
 * @returns {RemotePrerenderFunction<void, Output>}
 */
/**
 * Creates a prerendered remote function. The given function is invoked at build time and the result is stored to disk.
 * ```ts
 * import { blogPosts } from '$lib/server/db';
 *
 * export const blogPosts = prerender(() => blogPosts.getAll());
 * ```
 *
 * In case your function has an argument, you need to provide an `inputs` function that returns a list representing the arguments to be used for prerendering.
 * ```ts
 * import { blogPosts } from '$lib/server/db';
 *
 * export const blogPost = prerender(
 *  'unchecked',
 * 	(id: string) => blogPosts.get(id),
 * 	{ inputs: () => blogPosts.getAll().map((post) => post.id) }
 * );
 * ```
 *
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => MaybePromise<Output>} fn
 * @param {{ inputs?: RemotePrerenderInputsGenerator<Input>, dynamic?: boolean }} [options]
 * @returns {RemotePrerenderFunction<Input, Output>}
 */
/**
 * Creates a prerendered remote function. The given function is invoked at build time and the result is stored to disk.
 * ```ts
 * import { blogPosts } from '$lib/server/db';
 *
 * export const blogPosts = prerender(() => blogPosts.getAll());
 * ```
 *
 * In case your function has an argument, you need to provide an `inputs` function that returns a list representing the arguments to be used for prerendering.
 * ```ts
 * import z from 'zod';
 * import { blogPosts } from '$lib/server/db';
 *
 * export const blogPost = prerender(
 *  z.string(),
 * 	(id) => blogPosts.get(id),
 * 	{ inputs: () => blogPosts.getAll().map((post) => post.id) }
 * );
 * ```
 *
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Output>} fn
 * @param {{ inputs?: RemotePrerenderInputsGenerator<StandardSchemaV1.InferOutput<Schema>>, dynamic?: boolean }} [options]
 * @returns {RemotePrerenderFunction<StandardSchemaV1.InferOutput<Schema>, Output>}
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {any} [fn_or_options]
 * @param {{ inputs?: RemotePrerenderInputsGenerator<Input>, dynamic?: boolean }} [maybe_options]
 * @returns {RemotePrerenderFunction<Input, Output>}
 */
/*@__NO_SIDE_EFFECTS__*/
export function prerender(validate_or_fn, fn_or_options, maybe_options) {
	check_experimental('prerender');

	const maybe_fn = typeof fn_or_options === 'function' ? fn_or_options : undefined;
	/** @type {typeof maybe_options} */
	const options = maybe_options ?? (maybe_fn ? undefined : fn_or_options);
	/** @type {(arg?: Input) => MaybePromise<Output>} */
	const fn = maybe_fn ?? validate_or_fn;
	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/** @type {RemotePrerenderFunction<Input, Output> & { __: RemoteInfo }} */
	const wrapper = (arg) => {
		/** @type {Partial<RemoteResource<Output>>} */
		const promise = (async () => {
			const event = getRequestEvent();
			const info = get_remote_info(event);
			const stringified_arg = stringify_remote_arg(arg, info.transport);
			const id = wrapper.__.id;
			const url = `${base}/${app_dir}/remote/${id}${stringified_arg ? `/${stringified_arg}` : ''}`;

			if (!info.prerendering && !DEV && !event.isRemoteRequest) {
				try {
					return await get_response(id, arg, event, async () => {
						// TODO adapters can provide prerendered data more efficiently than
						// fetching from the public internet
						const response = await fetch(new URL(url, event.url.origin).href);

						if (!response.ok) {
							throw new Error('Prerendered response not found');
						}

						const prerendered = await response.json();
						info.results[create_remote_cache_key(id, stringified_arg)] = prerendered.result;
						return parse_remote_response(prerendered.result, info.transport);
					});
				} catch {
					// not available prerendered, fallback to normal function
				}
			}

			if (info.prerendering?.remote_responses.has(url)) {
				return /** @type {Promise<any>} */ (info.prerendering.remote_responses.get(url));
			}

			const maybe_promise = get_response(id, arg, event, () =>
				run_remote_function(event, false, arg, validate, fn)
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

			// TODO this is missing error/loading/current/status
			return result;
		})();

		return /** @type {RemoteResource<Output>} */ (promise);
	};

	Object.defineProperty(wrapper, '__', {
		value: /** @type {RemoteInfo} */ ({
			type: 'prerender',
			id: '',
			has_arg: !!maybe_fn,
			inputs: options?.inputs,
			dynamic: options?.dynamic
		})
	});

	return wrapper;
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
 * @template Output
 * @overload
 * @param {() => Output} fn
 * @returns {RemoteCommand<void, Output>}
 */
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
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => Output} fn
 * @returns {RemoteCommand<Input, Output>}
 */
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
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} validate
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => Output} fn
 * @returns {RemoteCommand<StandardSchemaV1.InferOutput<Schema>, Output>}
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(arg?: Input) => Output} [maybe_fn]
 * @returns {RemoteCommand<Input, Output>}
 */
/*@__NO_SIDE_EFFECTS__*/
export function command(validate_or_fn, maybe_fn) {
	check_experimental('command');

	/** @type {(arg?: Input) => Output} */
	const fn = maybe_fn ?? validate_or_fn;
	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/** @type {RemoteCommand<Input, Output> & { __: RemoteInfo }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call command '${wrapper.__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const event = getRequestEvent();

		if (!event.isRemoteRequest) {
			throw new Error(
				`Cannot call command '${wrapper.__.name}' during server side rendering. The only callable remote function types during server side rendering are 'query' and 'prerender'.`
			);
		}

		if (!get_remote_info(event).refreshes) {
			get_remote_info(event).refreshes = {};
		}

		const promise = Promise.resolve(run_remote_function(event, true, arg, validate, fn));
		// @ts-expect-error
		promise.updates = () => {
			throw new Error(`Cannot call '${wrapper.__.name}(...).updates(...)' on the server`);
		};
		return /** @type {ReturnType<RemoteCommand<Input, Output>>} */ (promise);
	};

	Object.defineProperty(wrapper, '__', {
		value: /** @type {RemoteInfo} */ ({
			type: 'command'
		})
	});

	return wrapper;
}

/**
 * Creates a form action. The passed function will be called when the form is submitted.
 * Returns an object that can be spread onto a form element to connect it to the function.
 * ```ts
 * import * as db from '$lib/server/db';
 *
 * export const createPost = form((formData) => {
 * 	const title = formData.get('title');
 * 	const content = formData.get('content');
 * 	return db.createPost({ title, content });
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
 * @param {(formData: FormData) => MaybePromise<T>} fn
 * @returns {RemoteForm<T>}
 */
/*@__NO_SIDE_EFFECTS__*/
// @ts-ignore we don't want to prefix `fn` with an underscore, as that will be user-visible
export function form(fn) {
	check_experimental('form');

	/**
	 * @param {string | number | boolean} [key]
	 * @param {string} [action]
	 */
	function create_instance(key, action = '') {
		/** @type {RemoteForm<T>} */
		const wrapper = {};

		wrapper.method = 'POST';
		wrapper.action = action; // This will be set by generated server code on startup, and for nested instances by the `for` method it is set by the calling parent
		wrapper.onsubmit = () => {};

		Object.defineProperty(wrapper, 'enhance', {
			value: () => {
				return { action: wrapper.action, method: wrapper.method, onsubmit: wrapper.onsubmit };
			}
		});

		const form_action = {
			type: 'submit',
			formaction: action,
			onclick: () => {}
		};
		Object.defineProperty(form_action, 'enhance', {
			value: () => {
				return { type: 'submit', formaction: wrapper.formAction.formaction, onclick: () => {} };
			}
		});
		Object.defineProperty(wrapper, 'formAction', {
			value: form_action
		});

		Object.defineProperty(wrapper, '__', {
			value: /** @type {RemoteInfo} */ ({
				type: 'form',
				id: 'unused for forms',
				// This allows us to deduplicate some logic at the callsites
				set_action: (action) => {
					wrapper.action = `?/remote=${encodeURIComponent(action)}`;
					wrapper.formAction.formaction = `?/remote=${encodeURIComponent(action)}`;
				},
				/** @param {FormData} form_data */
				fn: async (form_data) => {
					const event = getRequestEvent();
					const info = get_remote_info(event);

					if (!info.refreshes) {
						info.refreshes = {};
					}

					const result = await run_remote_function(event, true, form_data, (d) => d, fn);

					// We don't need to care about args or deduplicating calls, because uneval results are only relevant in full page reloads
					// where only one form submission is active at the same time
					if (!event.isRemoteRequest) {
						info.form_result = [key, result];
					}

					return result;
				}
			})
		});

		Object.defineProperty(wrapper, 'result', {
			get() {
				try {
					const info = get_remote_info(getRequestEvent());
					return info.form_result && info.form_result[0] === key ? info.form_result[1] : undefined;
				} catch {
					return undefined;
				}
			}
		});

		Object.defineProperty(wrapper, 'error', {
			get() {
				// When a form post fails on the server the nearest error page will be rendered instead, so we don't need this
				return /** @type {any} */ (null);
			}
		});

		if (key == undefined) {
			Object.defineProperty(wrapper, 'for', {
				/** @type {RemoteForm<any>['for']} */
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

	return create_instance();
}

/**
 * @param {any} validate_or_fn
 * @param {(arg?: any) => any} [maybe_fn]
 * @returns {(arg?: any) => MaybePromise<any>}
 */
function create_validator(validate_or_fn, maybe_fn) {
	if (!maybe_fn) {
		return (arg) => {
			if (arg !== undefined) {
				error(400, 'Bad request');
			}
		};
	} else if (validate_or_fn === 'unchecked') {
		return (arg) => arg; // no validation
	} else if ('~standard' in validate_or_fn) {
		return async (arg) => {
			// Get event before asyn validation to ensure it's available in server environments without async local storage, too
			const event = getRequestEvent();
			const remoteInfo = get_remote_info(event);
			const result = await validate_or_fn['~standard'].validate(arg);
			// if the `issues` field exists, the validation failed
			if (result.issues) {
				error(
					400,
					await remoteInfo.handleValidationError({
						...result,
						event
					})
				);
			}
			return result.value;
		};
	} else {
		return () => {
			throw new Error(
				'Invalid validator passed to remote function. Expected "unchecked" or a standard schema'
			);
		};
	}
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
 * @param {any} arg
 * @param {RequestEvent} event
 * @param {() => T} get_result
 * @returns {T}
 */
function get_response(id, arg, event, get_result) {
	const info = get_remote_info(event);

	// We only want to do this for full page visits where we can safely deduplicate calls (for remote calls we would have
	// to ensure they come from the same user) and have to stringify the result into the HTML
	if (event.isRemoteRequest) return get_result();

	const cache_key = create_remote_cache_key(id, stringify_remote_arg(arg, info.transport));

	if (!(cache_key in info.results)) {
		// TODO better error handling when promise rejects?
		info.results[cache_key] = Promise.resolve(get_result()).catch(() => {
			delete info.results[cache_key];
			return /** @type {any} */ (undefined);
		});
	}

	return /** @type {T} */ (info.results[cache_key]);
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
 * @param {any} arg
 * @param {(arg: any) => any} validate
 * @param {(arg?: any) => T} fn
 */
async function run_remote_function(event, allow_cookies, arg, validate, fn) {
	/** @type {RequestEvent} */
	const cleansed = {
		...event,
		setHeaders: () => {
			throw new Error('setHeaders is not allowed in remote functions');
		},
		cookies: {
			...event.cookies,
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

	// In two parts, each with_event, so that runtimes without async local storage can still get the event at the start of the function
	const validated = await with_event(cleansed, () => validate(arg));
	return with_event(cleansed, () => fn(validated));
}
