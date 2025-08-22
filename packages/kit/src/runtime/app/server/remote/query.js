/** @import { RemoteQuery, RemoteQueryFunction, RemoteQueryStream, RemoteQueryStreamFunction } from '@sveltejs/kit' */
/** @import { RemoteInfo, MaybePromise } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { create_remote_cache_key, stringify_remote_arg } from '../../../shared.js';
import { prerendering } from '__sveltekit/environment';
import { create_validator, get_response, run_remote_function } from './shared.js';

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

/**
 * Creates a batch query function that collects multiple calls and executes them in a single request
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.batch) for full documentation.
 *
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(args: Input[]) => MaybePromise<Output[]>} fn
 * @returns {RemoteQueryFunction<Input, Output>}
 * @since 2.35
 */
/**
 * Creates a batch query function that collects multiple calls and executes them in a single request
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.batch) for full documentation.
 *
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(args: StandardSchemaV1.InferOutput<Schema>[]) => MaybePromise<Output[]>} fn
 * @returns {RemoteQueryFunction<StandardSchemaV1.InferInput<Schema>, Output>}
 * @since 2.35
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(args?: Input[]) => MaybePromise<Output[]>} [maybe_fn]
 * @returns {RemoteQueryFunction<Input, Output>}
 * @since 2.35
 */
/*@__NO_SIDE_EFFECTS__*/
function batch(validate_or_fn, maybe_fn) {
	/** @type {(args?: Input[]) => Output[]} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/**
	 * @param {any[]} input
	 * @param {any} output
	 */
	function validate_output(input, output) {
		if (!Array.isArray(output)) {
			throw new Error(
				`Batch query '${__.name}' returned a result of type ${typeof output}. It must return an array of the same length as the input array`
			);
		}

		if (input.length !== output.length) {
			throw new Error(
				`Batch query '${__.name}' was called with ${input.length} arguments, but returned ${output.length} results. Make sure to return an array of the same length as the input array`
			);
		}
	}

	/** @type {RemoteInfo & { type: 'query_batch' }} */
	const __ = {
		type: 'query_batch',
		id: '',
		name: '',
		run: async (args) => {
			const { event, state } = get_request_store();

			const results = await run_remote_function(
				event,
				state,
				false,
				args,
				(array) => Promise.all(array.map(validate)),
				fn
			);

			validate_output(args, results);

			return results;
		}
	};

	/** @type {{ args: any[], resolvers: Array<{resolve: (value: any) => void, reject: (error: any) => void}> }} */
	let batching = { args: [], resolvers: [] };

	/** @type {RemoteQueryFunction<Input, Output> & { __: RemoteInfo }} */
	const wrapper = (arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query.batch '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();

		/** @type {Promise<any> & Partial<RemoteQuery<any>>} */
		const promise = get_response(__.id, arg, state, () => {
			// Collect all the calls to the same query in the same macrotask,
			// then execute them as one backend request.
			return new Promise((resolve, reject) => {
				batching.args.push(arg);
				batching.resolvers.push({ resolve, reject });

				if (batching.args.length > 1) return;

				setTimeout(async () => {
					const batched = batching;
					batching = { args: [], resolvers: [] };

					try {
						const results = await run_remote_function(
							event,
							state,
							false,
							batched.args,
							(array) => Promise.all(array.map(validate)),
							fn
						);

						validate_output(batched.args, results);

						for (let i = 0; i < batched.resolvers.length; i++) {
							batched.resolvers[i].resolve(results[i]);
						}
					} catch (error) {
						for (const resolver of batched.resolvers) {
							resolver.reject(error);
						}
					}
				}, 0);
			});
		});

		promise.catch(() => {});

		promise.refresh = async () => {
			const { state } = get_request_store();
			const refreshes = state.refreshes;

			if (!refreshes) {
				throw new Error(
					`Cannot call refresh on query.batch '${__.name}' because it is not executed in the context of a command/form remote function`
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

/**
 * Creates a streaming remote query. When called from the browser, the generator function will be invoked on the server and values will be streamed via Server-Sent Events.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.stream) for full documentation.
 *
 * @template Output
 * @overload
 * @param {() => Generator<Output, void, unknown> | AsyncGenerator<Output, void, unknown>} fn
 * @returns {RemoteQueryStreamFunction<void, Output>}
 * @since 2.36
 */
/**
 * Creates a streaming remote query. When called from the browser, the generator function will be invoked on the server and values will be streamed via Server-Sent Events.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.stream) for full documentation.
 *
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => Generator<Output, void, unknown> | AsyncGenerator<Output, void, unknown>} fn
 * @returns {RemoteQueryStreamFunction<Input, Output>}
 * @since 2.36
 */
/**
 * Creates a streaming remote query. When called from the browser, the generator function will be invoked on the server and values will be streamed via Server-Sent Events.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#query.stream) for full documentation.
 *
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => Generator<Output, void, unknown> | AsyncGenerator<Output, void, unknown>} fn
 * @returns {RemoteQueryStreamFunction<StandardSchemaV1.InferInput<Schema>, Output>}
 * @since 2.36
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(arg?: Input) => Generator<Output, void, unknown> | AsyncGenerator<Output, void, unknown>} [maybe_fn]
 * @returns {RemoteQueryStreamFunction<Input, Output>}
 * @since 2.36
 */
/*@__NO_SIDE_EFFECTS__*/
function stream(validate_or_fn, maybe_fn) {
	/** @type {(arg?: Input) => Generator<Output, void, unknown> | AsyncGenerator<Output, void, unknown>} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/** @type {RemoteInfo} */
	const __ = { type: 'query_stream', id: '', name: '' };

	/** @type {RemoteQueryStreamFunction<Input, Output> & { __: RemoteInfo }} */
	const wrapper = (/** @type {Input} */ arg) => {
		if (prerendering) {
			throw new Error(
				`Cannot call query.stream '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
			);
		}

		const { event, state } = get_request_store();

		/** @type {IteratorResult<Output> | undefined} */
		let first_value;

		const promise = (async () => {
			// We only care about the generator when doing a remote request
			if (event.isRemoteRequest) return;

			const generator = await run_remote_function(event, state, false, arg, validate, fn);
			first_value = await generator.next();
			await generator.return();
			return first_value.done ? undefined : first_value.value;
		})();

		// Catch promise to avoid unhandled rejection
		promise.catch(() => {});

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		Object.assign(promise, {
			async *[Symbol.asyncIterator]() {
				if (event.isRemoteRequest) {
					const generator = await run_remote_function(event, state, false, arg, validate, fn);
					yield* generator;
				} else {
					// TODO how would we subscribe to the stream on the server while deduplicating calls and knowing when to stop?
					throw new Error(
						'Cannot iterate over a stream on the server. This restriction may be lifted in a future version.'
					);
				}
			},
			get error() {
				return undefined;
			},
			get ready() {
				return !!first_value;
			},
			get current() {
				return first_value?.value;
			}
		});

		return /** @type {RemoteQueryStream<Output>} */ (promise);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}

// Add batch and stream as properties to the query function
Object.defineProperty(query, 'batch', { value: batch, enumerable: true });
Object.defineProperty(query, 'stream', { value: stream, enumerable: true });
