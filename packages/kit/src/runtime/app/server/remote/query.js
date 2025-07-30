/** @import { RemoteQuery, RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteInfo, MaybePromise } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { getRequestEvent } from '../event.js';
import { get_remote_info } from '../../../server/remote.js';
import { create_remote_cache_key, stringify_remote_arg } from '../../../shared.js';
import { prerendering } from '__sveltekit/environment';
import {
	check_experimental,
	create_validator,
	get_response,
	run_remote_function
} from './shared.js';

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
		if (prerendering) {
			throw new Error(
				`Cannot call query '${wrapper.__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const event = getRequestEvent();

		/** @type {Promise<any> & Partial<RemoteQuery<any>>} */
		const promise = get_response(/** @type {RemoteInfo} */ (wrapper.__).id, arg, event, () =>
			run_remote_function(event, false, arg, validate, fn)
		);

		promise.catch(() => {});

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
