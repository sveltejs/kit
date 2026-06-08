/** @import { RemoteResource, RemotePrerenderFunction, RequestEvent } from '@sveltejs/kit' */
/** @import { RemotePrerenderInputsGenerator, RemotePrerenderInternals, MaybePromise, RequestState, RemoteQueriesMap } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { error, json } from '@sveltejs/kit';
import { DEV } from 'esm-env';
import { get_request_store } from '@sveltejs/kit/internal/server';
import {
	create_remote_key,
	parse_remote_value,
	REMOTE_VALUE_BRAND,
	stringify_remote_arg
} from '../../../shared.js';
import { noop } from '../../../../utils/functions.js';
import { app_dir, base } from '$app/paths/internal/server';
import {
	create_validator,
	get_cache,
	get_decoders,
	get_response,
	parse_remote_response,
	run_remote_function,
	serialize_remote_result
} from './shared.js';

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
	const maybe_fn = typeof fn_or_options === 'function' ? fn_or_options : undefined;

	/** @type {typeof maybe_options} */
	const options = maybe_options ?? (maybe_fn ? undefined : fn_or_options);

	/** @type {(arg?: Input) => MaybePromise<Output>} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/** @type {RemotePrerenderInternals} */
	const __ = {
		type: 'prerender',
		id: '',
		name: '',
		has_arg: !!maybe_fn,
		inputs: options?.inputs,
		dynamic: options?.dynamic
	};

	/** @type {RemotePrerenderFunction<Input, Output> & { __: RemotePrerenderInternals }} */
	const wrapper = (arg) => {
		// Compute the payload synchronously (within the request context) so the returned
		// promise can be marked as a serializable pointer before any awaiting occurs.
		const { state: outer_state } = get_request_store();
		const outer_payload = stringify_remote_arg(arg, outer_state.transport);

		/** @type {Promise<Output> & Partial<RemoteResource<Output>>} */
		const promise = (async () => {
			const { event, state } = get_request_store();
			const payload = outer_payload;
			const id = __.id;
			const url = `${base}/${app_dir}/remote/${id}${payload ? `/${payload}` : ''}`;

			if (!state.prerendering && !DEV && !event.isRemoteRequest) {
				try {
					return await get_response(__, payload, state, async () => {
						const cache = get_cache(__, state);

						// TODO adapters can provide prerendered data more efficiently than
						// fetching from the public internet
						const promise = (cache[payload] ??= {
							serialize: true,
							data: fetch(new URL(url, event.url.origin).href).then(async (response) => {
								if (!response.ok) {
									throw new Error('Prerendered response not found');
								}

								const prerendered = await response.json();

								if (prerendered.type === 'error') {
									error(prerendered.status, prerendered.error);
								}

								// Stash any nested prerender values the endpoint shipped in its
								// `queries` side-channel so their pointers can be revived without
								// re-fetching (see `resolve_prerendered`).
								store_prerender_seeds(prerendered.queries, state);

								return prerendered.result;
							})
						}).data;

						return parse_remote_value(
							await promise,
							get_decoders(state.transport),
							make_prerender_reviver(state, event)
						);
					});
				} catch {
					// not available prerendered, fallback to normal function
				}
			}

			if (state.prerendering?.remote_responses.has(url)) {
				return /** @type {Promise<any>} */ (state.prerendering.remote_responses.get(url));
			}

			const promise = get_response(__, payload, state, () =>
				run_remote_function(event, state, false, () => validate(arg), fn)
			);

			if (state.prerendering) {
				state.prerendering.remote_responses.set(url, promise);
			}

			const result = await promise;

			if (state.prerendering) {
				// prerender results may only nest other prerenders (allow_queries: false)
				const body = { type: 'result', result: serialize_remote_result(result, state, false) };
				state.prerendering.dependencies.set(url, {
					body: JSON.stringify(body),
					response: json(body)
				});
			}

			// TODO this is missing error/loading/current/status
			return result;
		})();

		promise.catch(noop);

		// Allow this prerender result to be serialized as a `[id, payload, code]` pointer
		// when it is returned (nested) from another remote function.
		void Object.defineProperty(promise, REMOTE_VALUE_BRAND, {
			value: { internals: __, payload: outer_payload }
		});

		return /** @type {RemoteResource<Output>} */ (promise);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}

/**
 * Stash the nested values a prerender endpoint shipped in its `queries` side-channel into the
 * request-stored seed cache, keyed by `create_remote_key(id, payload)`, so nested prerender
 * pointers can be revived without an extra request.
 *
 * @param {string | undefined} queries
 * @param {RequestState} state
 */
function store_prerender_seeds(queries, state) {
	if (!queries) return;

	const map = /** @type {RemoteQueriesMap} */ (parse_remote_response(queries, state.transport));

	const seeds = (state.remote.prerender_seeds ??= new Map());

	for (const key in map) {
		seeds.set(key, map[key]);
	}
}

/**
 * Builds the `__skq` reviver used when parsing a prerendered payload on the server. Nested
 * prerender pointers are revived via {@link resolve_prerendered}; queries can never appear in
 * a prerender result (they're rejected at serialization time).
 *
 * @param {RequestState} state
 * @param {RequestEvent} event
 */
function make_prerender_reviver(state, event) {
	/** @param {[string, string, 'q' | 'b' | 'p']} pointer */
	return ([id, payload, code]) => {
		if (code !== 'p') {
			throw new Error('A prerender function can only return other prerender functions');
		}

		return resolve_prerendered(id, payload, state, event);
	};
}

/**
 * Server-side revival of a nested prerender pointer. Returns a marked, awaitable resource that
 * resolves to the nested value — from the parent's `queries` seed when available, otherwise by
 * fetching the nested prerender's own endpoint — and registers it in `state.remote.data` so its
 * value is serialized for client hydration (rather than being re-fetched by the browser).
 *
 * @param {string} id
 * @param {string} payload
 * @param {RequestState} state
 * @param {RequestEvent} event
 * @returns {Promise<any>}
 */
function resolve_prerendered(id, payload, state, event) {
	const key = create_remote_key(id, payload);

	const resolved = (state.remote.prerender_resolved ??= new Map());
	const existing = resolved.get(key);
	if (existing) return existing;

	const name = id.slice(id.lastIndexOf('/') + 1);

	// synthetic internals — only `id`, `type` and `name` are read by the serialization layer
	/** @type {RemotePrerenderInternals} */
	const internals = { type: 'prerender', id, name, has_arg: payload !== '' };

	const promise = (async () => {
		const seed = state.remote.prerender_seeds?.get(key);

		if (seed !== undefined) {
			if (seed.type === 'error') {
				error(seed.status ?? 500, seed.error);
			}

			return parse_remote_value(
				seed.data,
				get_decoders(state.transport),
				make_prerender_reviver(state, event)
			);
		}

		// not seeded (e.g. served from a static prerendered file without a side-channel) —
		// fetch the nested prerender's own endpoint, which serves its prerendered data
		const url = `${base}/${app_dir}/remote/${id}${payload ? `/${payload}` : ''}`;
		const response = await fetch(new URL(url, event.url.origin).href);

		if (!response.ok) {
			throw new Error('Prerendered response not found');
		}

		const prerendered = await response.json();

		if (prerendered.type === 'error') {
			error(prerendered.status, prerendered.error);
		}

		store_prerender_seeds(prerendered.queries, state);

		return parse_remote_value(
			prerendered.result,
			get_decoders(state.transport),
			make_prerender_reviver(state, event)
		);
	})();

	promise.catch(noop);

	// re-serialize as a pointer when this nested resource is itself serialized
	void Object.defineProperty(promise, REMOTE_VALUE_BRAND, { value: { internals, payload } });

	// register the value so `render.js` seeds it into the hydration payload for the client
	get_cache(internals, state)[payload] = { serialize: true, data: promise };

	resolved.set(key, promise);

	return promise;
}
