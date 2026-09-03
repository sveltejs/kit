/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { MaybePromise, RequestState, RemoteInternals, RemoteLiveQueryUserFunctionReturnType } from 'types' */
/** @import { Kind } from '../../../server/context.js' */
import { error } from '@sveltejs/kit';
import { ValidationError } from '@sveltejs/kit/internal';
import { derive_event, is_in } from '../../../server/context.js';
import { with_request_store } from '@sveltejs/kit/internal/server';

/**
 * @param {any} validate_or_fn
 * @param {((arg?: any) => any) | undefined} [maybe_fn]
 * @returns {(arg?: any) => MaybePromise<any>}
 */
export function create_validator(validate_or_fn, maybe_fn) {
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
			// access property and call method in one go to preserve potential this context
			const result = await validate_or_fn['~standard'].validate(arg);

			// if the `issues` field exists, the validation failed
			if (result.issues) {
				throw new ValidationError(result.issues);
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
 * @param {string} payload — the stringified raw argument (i.e. the cache key the client will use)
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {() => Promise<T>} get_result
 * @returns {Promise<T>}
 */
export async function get_response(internals, payload, event, state, get_result) {
	// wait a beat, in case `myQuery().set(...)` or `myQuery().refresh()` is immediately called
	// eslint-disable-next-line @typescript-eslint/await-thenable
	await 0;

	const cache = get_cache(internals, state);

	if (!is_in(event, 'query')) {
		// if this is a top-level (not nested) `await myQuery()`, include it in the serialized response
		get_implicit_lookup(internals, state)[payload] = get_result;
	}

	return (cache[payload] ??= get_result());
}

/**
 * Like `with_event` but removes things from `event` you cannot see/call in remote functions, such as `setHeaders`.
 * @template T
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {Kind} kind
 * @param {() => any} get_input
 * @param {(arg?: any) => T} fn
 */
export async function run_remote_function(event, state, kind, get_input, fn) {
	const store = { event: derive_event(event, kind), state };

	// In two parts, each with_event, so that runtimes without async local storage can still get the event at the start of the function
	const input = await with_request_store(store, get_input);
	return with_request_store(store, () => fn(input));
}

/**
 * Like `with_event` but removes things from `event` you cannot see/call in remote functions, such as `setHeaders`.
 * @template T
 * @param {RequestEvent} event
 * @param {RequestState} state
 * @param {Kind} kind
 * @param {() => any} get_input
 * @param {(arg?: any) => RemoteLiveQueryUserFunctionReturnType<T>} fn
 * @param {string} name
 */
export async function* run_remote_generator(event, state, kind, get_input, fn, name) {
	const store = { event: derive_event(event, kind), state };

	// In two parts, each with_event, so that runtimes without async local storage can still get the event at the start of the function / calls to next
	const input = await with_request_store(store, get_input);
	const source = await with_request_store(store, () => fn(input));
	const iterator = to_iterator(source, name);
	let done = false;

	try {
		while (true) {
			// the code of a generator function is basically chopped apart at each
			// yield, and each part is an invocation of `.next`. So, to provide
			// access to the request context in generator functions, we have to
			// provide it to every invocation of `.next`. (It's more obvious that
			// this is necessary with plain iterators.)
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
 * Note that `state` is deliberately not optional: resources that capture the request
 * state at creation must pass it explicitly, because reading it from the request store
 * at call time is only equivalent on runtimes with `AsyncLocalStorage` support.
 * Callers without a captured state (such as the module-level `form` instance getters)
 * should pass `get_request_store().state` themselves.
 * @param {RemoteInternals} internals
 * @param {RequestState} state
 */
export function get_cache(internals, state) {
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
 */
export function get_implicit_lookup(internals, state) {
	let cache = state.remote.implicit?.get(internals);

	if (cache === undefined) {
		cache = {};
		(state.remote.implicit ??= new Map()).set(internals, cache);
	}

	return cache;
}
