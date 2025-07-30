/** @import { RemoteCommand } from '@sveltejs/kit' */
/** @import { RemoteInfo, MaybePromise } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { getRequestEvent } from '../event.js';
import { prerendering } from '__sveltekit/environment';
import { check_experimental, create_validator, run_remote_function } from './shared.js';
import { get_event_state } from '../../../server/event-state.js';

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

		get_event_state(event).refreshes ??= {};

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
