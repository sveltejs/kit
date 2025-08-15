/** @import { RemoteQuery, RemoteQueryFunction } from '@sveltejs/kit' */
/** @import { RemoteInfo, MaybePromise } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { create_remote_cache_key, stringify_remote_arg } from '../../../shared.js';
import { prerendering } from '__sveltekit/environment';
import {
	check_experimental,
	create_validator,
	get_response,
	run_remote_function
} from './shared.js';

/**
 * Creates a remote query. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
 *
 * @template Output
 * @overload
 * @param {() => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<void, Output>}
 * @since 2.27
 */
/**
 * Creates a remote query. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
 *
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<Input, Output>}
 * @since 2.27
 */
/**
 * Creates a remote query. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query) for full documentation.
 *
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<StandardSchemaV1.InferInput<Schema>, Output>}
 * @since 2.27
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(args?: Input) => MaybePromise<Output>} [maybe_fn]
 * @returns {RemoteQueryFunction<Input, Output>}
 * @since 2.27
 */
/*@__NO_SIDE_EFFECTS__*/
export function query(validate_or_fn, maybe_fn) {
	check_experimental('query');

	/** @type {(arg?: Input) => Output} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/** @type {RemoteInfo} */
	const __ = { type: 'query', id: '', name: '' };

	/** @type {RemoteQueryFunction<Input, Output> & { __: RemoteInfo }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();

		/** @type {Promise<any> & Partial<RemoteQuery<any>>} */
		const promise = get_response(__.id, arg, state, () =>
			run_remote_function(event, state, false, arg, validate, fn)
		);

		promise.catch(() => {});

		promise.refresh = async () => {
			const { state } = get_request_store();
			const refreshes = state.refreshes;

			if (!refreshes) {
				throw new Error(
					`Cannot call refresh on query '${__.name}' because it is not executed in the context of a command/form remote function`
				);
			}

			const cache_key = create_remote_cache_key(__.id, stringify_remote_arg(arg, state.transport));
			refreshes[cache_key] = await /** @type {Promise<any>} */ (promise);
		};

		promise.withOverride = () => {
			throw new Error(`Cannot call '${__.name}.withOverride()' on the server`);
		};

		return /** @type {RemoteQuery<Output>} */ (promise);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}
