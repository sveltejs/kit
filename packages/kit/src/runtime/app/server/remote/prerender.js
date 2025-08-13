/** @import { RemoteResource, RemotePrerenderFunction } from '@sveltejs/kit' */
/** @import { RemotePrerenderInputsGenerator, RemoteInfo, MaybePromise } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { error, json } from '@sveltejs/kit';
import { DEV } from 'esm-env';
import { getRequestEvent } from '../event.js';
import { create_remote_cache_key, stringify, stringify_remote_arg } from '../../../shared.js';
import { app_dir, base } from '__sveltekit/paths';
import {
	check_experimental,
	create_validator,
	get_response,
	parse_remote_response,
	run_remote_function
} from './shared.js';
import { get_event_state } from '../../../server/event-state.js';

/**
 * Creates a remote prerender function. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#prerender) for full documentation.
 *
 * @template Output
 * @overload
 * @param {() => MaybePromise<Output>} fn
 * @param {{ inputs?: RemotePrerenderInputsGenerator<void>, dynamic?: boolean }} [options]
 * @returns {RemotePrerenderFunction<void, Output>}
 * @since 2.27
 */
/**
 * Creates a remote prerender function. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#prerender) for full documentation.
 *
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => MaybePromise<Output>} fn
 * @param {{ inputs?: RemotePrerenderInputsGenerator<Input>, dynamic?: boolean }} [options]
 * @returns {RemotePrerenderFunction<Input, Output>}
 * @since 2.27
 */
/**
 * Creates a remote prerender function. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#prerender) for full documentation.
 *
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Output>} fn
 * @param {{ inputs?: RemotePrerenderInputsGenerator<StandardSchemaV1.InferInput<Schema>>, dynamic?: boolean }} [options]
 * @returns {RemotePrerenderFunction<StandardSchemaV1.InferInput<Schema>, Output>}
 * @since 2.27
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {any} [fn_or_options]
 * @param {{ inputs?: RemotePrerenderInputsGenerator<Input>, dynamic?: boolean }} [maybe_options]
 * @returns {RemotePrerenderFunction<Input, Output>}
 * @since 2.27
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

	/** @type {RemoteInfo} */
	const __ = {
		type: 'prerender',
		id: '',
		name: '',
		has_arg: !!maybe_fn,
		inputs: options?.inputs,
		dynamic: options?.dynamic
	};

	/** @type {RemotePrerenderFunction<Input, Output> & { __: RemoteInfo }} */
	const wrapper = (arg) => {
		/** @type {Promise<Output> & Partial<RemoteResource<Output>>} */
		const promise = (async () => {
			const event = getRequestEvent();
			const state = get_event_state(event);
			const payload = stringify_remote_arg(arg, state.transport);
			const id = __.id;
			const url = `${base}/${app_dir}/remote/${id}${payload ? `/${payload}` : ''}`;

			if (!state.prerendering && !DEV && !event.isRemoteRequest) {
				try {
					return await get_response(id, arg, event, async () => {
						// TODO adapters can provide prerendered data more efficiently than
						// fetching from the public internet
						const response = await fetch(new URL(url, event.url.origin).href);

						if (!response.ok) {
							throw new Error('Prerendered response not found');
						}

						const prerendered = await response.json();

						if (prerendered.type === 'error') {
							error(prerendered.status, prerendered.error);
						}

						// TODO can we redirect here?

						(state.remote_data ??= {})[create_remote_cache_key(id, payload)] = prerendered.result;
						return parse_remote_response(prerendered.result, state.transport);
					});
				} catch {
					// not available prerendered, fallback to normal function
				}
			}

			if (state.prerendering?.remote_responses.has(url)) {
				return /** @type {Promise<any>} */ (state.prerendering.remote_responses.get(url));
			}

			const promise = get_response(id, arg, event, () =>
				run_remote_function(event, false, arg, validate, fn)
			);

			if (state.prerendering) {
				state.prerendering.remote_responses.set(url, promise);
			}

			const result = await promise;

			if (state.prerendering) {
				const body = { type: 'result', result: stringify(result, state.transport) };
				state.prerendering.dependencies.set(url, {
					body: JSON.stringify(body),
					response: json(body)
				});
			}

			// TODO this is missing error/loading/current/status
			return result;
		})();

		promise.catch(() => {});

		return /** @type {RemoteResource<Output>} */ (promise);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}
