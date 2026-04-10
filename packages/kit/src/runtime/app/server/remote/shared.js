/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { ServerHooks, MaybePromise, RequestState, RemoteInternals, RequestStore, RemoteLiveQueryUserFunctionReturnType } from 'types' */
import { parse } from 'devalue';
import { error } from '@sveltejs/kit';
import { with_request_store, get_request_store } from '@sveltejs/kit/internal/server';
import { noop } from '../../../../utils/functions.js';
import {
	stringify_remote_arg,
	create_remote_key,
	stringify,
	unfriendly_hydratable
} from '../../../shared.js';

/**
 * @param {() => RemoteInternals} get_internals
 * @param {any} validate_or_fn
 * @param {((arg?: any) => any) | undefined} maybe_fn
 * @returns {(arg?: any) => MaybePromise<any>}
 */
export function create_validator(get_internals, validate_or_fn, maybe_fn) {
	// prevent functions without validators being called with arguments
	if (!maybe_fn) {
		return (arg) => {
			if (arg !== undefined) {
				error(400, 'Bad Request');
			}
		};
	}

	// if 'unchecked', pass input through without validating
	if (validate_or_fn === 'unchecked') {
		return (arg) => arg;
	}

	// use https://standardschema.dev validator if provided
	if ('~standard' in validate_or_fn) {
		return async (arg) => {
			// Get event before async validation to ensure it's available in server environments without AsyncLocalStorage, too
			const { event, state } = get_request_store();

			if (is_validated_argument(get_internals(), state, arg)) {
				return arg;
			}

			// access property and call method in one go to preserve potential this context
			const result = await validate_or_fn['~standard'].validate(arg);

			// if the `issues` field exists, the validation failed
			if (result.issues) {
				error(
					400,
					await state.handleValidationError({
						issues: result.issues,
						event
					})
				);
			}

			return result.value;
		};
	}

	throw new Error(
		'Invalid validator passed to remote function. Expected "unchecked" or a Standard Schema (https://standardschema.dev)'
	);
}

/**
 * In case of a single remote function call, just returns the result.
 *
 * In case of a full page reload, returns the response for a remote function call,
 * either from the cache or by invoking the function.
 * Also saves an uneval'ed version of the result for later HTML inlining for hydration.
 *
 * @template {MaybePromise<any>} T
 * @param {RemoteInternals} internals
 * @param {any} arg
 * @param {RequestState} state
 * @param {() => Promise<T>} get_result
 * @returns {Promise<T>}
 */
export async function get_response(internals, arg, state, get_result) {
	// wait a beat, in case `myQuery().set(...)` or `myQuery().refresh()` is immediately called
	// eslint-disable-next-line @typescript-eslint/await-thenable
	await 0;

	const cache = get_cache(internals, state);
	const key = stringify_remote_arg(arg, state.transport);
	const entry = (cache[key] ??= {
		serialize: false,
		data: get_result()
	});

	entry.serialize ||= !!state.is_in_universal_load;

	if (state.is_in_render && internals.id) {
		const remote_key = create_remote_key(internals.id, key);

		Promise.resolve(entry.data)
			.then((value) => {
				void unfriendly_hydratable(remote_key, () => stringify(value, state.transport));
			})
			.catch(noop);
	}

	return entry.data;
}

/**
 * @param {any} data
 * @param {ServerHooks['transport']} transport
 */
export function parse_remote_response(data, transport) {
	/** @type {Record<string, any>} */
	const revivers = {};
	for (const key in transport) {
		revivers[key] = transport[key].decode;
	}

	return parse(data, revivers);
}

/**
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {boolean} allow_cookies
 * @returns {RequestStore}
 */
function derive_remote_function_event(event, state, allow_cookies) {
	return {
		event: {
			...event,
			setHeaders: () => {
				throw new Error('setHeaders is not allowed in remote functions');
			},
			cookies: {
				...event.cookies,
				set: (name, value, opts) => {
					if (!allow_cookies) {
						throw new Error('Cannot set cookies in `query` or `prerender` functions');
					}

					if (opts.path && !opts.path.startsWith('/')) {
						throw new Error('Cookies set in remote functions must have an absolute path');
					}

					return event.cookies.set(name, value, opts);
				},
				delete: (name, opts) => {
					if (!allow_cookies) {
						throw new Error('Cannot delete cookies in `query` or `prerender` functions');
					}

					if (opts.path && !opts.path.startsWith('/')) {
						throw new Error('Cookies deleted in remote functions must have an absolute path');
					}

					return event.cookies.delete(name, opts);
				}
			}
		},
		state: {
			...state,
			is_in_remote_function: true
		}
	};
}

/**
 * Like `with_event` but removes things from `event` you cannot see/call in remote functions, such as `setHeaders`.
 * @template T
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {boolean} allow_cookies
 * @param {() => any} get_input
 * @param {(arg?: any) => T} fn
 */
export async function run_remote_function(event, state, allow_cookies, get_input, fn) {
	const store = derive_remote_function_event(event, state, allow_cookies);

	// In two parts, each with_event, so that runtimes without async local storage can still get the event at the start of the function
	const input = await with_request_store(store, get_input);
	return with_request_store(store, () => fn(input));
}

/**
 * Like `with_event` but removes things from `event` you cannot see/call in remote functions, such as `setHeaders`.
 * @template T
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {boolean} allow_cookies
 * @param {() => any} get_input
 * @param {(arg?: any) => RemoteLiveQueryUserFunctionReturnType<T>} fn
 * @param {string} name
 */
export async function* run_remote_generator(event, state, allow_cookies, get_input, fn, name) {
	const store = derive_remote_function_event(event, state, allow_cookies);

	// In two parts, each with_event, so that runtimes without async local storage can still get the event at the start of the function / calls to next
	const input = await with_request_store(store, get_input);
	const source = await with_request_store(store, () => fn(input));
	const iterator = to_iterator(source, name);
	let done = false;

	try {
		while (true) {
			const result = await with_request_store(store, () => iterator.next());
			if (result.done) {
				done = true;
				return result.value;
			}
			yield result.value;
		}
	} finally {
		if (!done && typeof iterator.return === 'function') {
			await with_request_store(store, () => iterator.return?.(undefined));
		}
	}
}

/**
 * @template T
 * @param {Awaited<RemoteLiveQueryUserFunctionReturnType<T>>} source
 * @param {string} name
 * @returns {Iterator<T> | AsyncIterator<T>}
 */
function to_iterator(source, name) {
	// intentionally using `in` because these could be inherited
	if ('next' in source && typeof source.next === 'function') {
		return source;
	}

	if (Symbol.asyncIterator in source && typeof source[Symbol.asyncIterator] === 'function') {
		return source[Symbol.asyncIterator]();
	}

	if (Symbol.iterator in source && typeof source[Symbol.iterator] === 'function') {
		return source[Symbol.iterator]();
	}

	throw new Error(
		`query.live '${name}' must return an Iterator, Iterable, AsyncIterator or AsyncIterable`
	);
}

/**
 * @param {RemoteInternals} internals
 * @param {RequestState} state
 */
export function get_cache(internals, state = get_request_store().state) {
	let cache = state.remote.data?.get(internals);

	if (cache === undefined) {
		cache = {};
		(state.remote.data ??= new Map()).set(internals, cache);
	}

	return cache;
}

/**
 * @param {RemoteInternals} internals
 * @param {RequestState} state
 * @param {any} arg
 */
function is_validated_argument(internals, state, arg) {
	return state.remote.validated?.get(internals.id)?.has(arg) ?? false;
}

/**
 * @param {RemoteInternals} internals
 * @param {RequestState} state
 * @param {any} arg
 */
export function mark_argument_validated(internals, state, arg) {
	const validated = (state.remote.validated ??= new Map());
	let validated_args = validated.get(internals.id);

	if (!validated_args) {
		validated_args = new Set();
		validated.set(internals.id, validated_args);
	}

	validated_args.add(arg);
	return arg;
}
