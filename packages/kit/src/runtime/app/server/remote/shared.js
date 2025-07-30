/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { ServerHooks, MaybePromise } from 'types' */
import { parse } from 'devalue';
import { error } from '@sveltejs/kit';
import { getRequestEvent, with_event } from '../event.js';
import { get_remote_info } from '../../../server/remote.js';
import { create_remote_cache_key, stringify_remote_arg } from '../../../shared.js';

/**
 * @param {any} validate_or_fn
 * @param {(arg?: any) => any} [maybe_fn]
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
			// Get event before async validation to ensure it's available in server environments without AsyncLocalStorage, too
			const event = getRequestEvent();
			const info = get_remote_info(event);
			const validate = validate_or_fn['~standard'].validate;

			const result = await validate(arg);

			// if the `issues` field exists, the validation failed
			if (result.issues) {
				error(
					400,
					await info.handleValidationError({
						...result,
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
 * @param {string} id
 * @param {any} arg
 * @param {RequestEvent} event
 * @param {() => Promise<T>} get_result
 * @returns {Promise<T>}
 */
export function get_response(id, arg, event, get_result) {
	const info = get_remote_info(event);

	const cache_key = create_remote_cache_key(id, stringify_remote_arg(arg, info.transport));

	return /** @type {Promise<T>} */ (info.results[cache_key] ??= get_result());
}

/** @param {string} feature */
export function check_experimental(feature) {
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
export function parse_remote_response(data, transport) {
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
export async function run_remote_function(event, allow_cookies, arg, validate, fn) {
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
