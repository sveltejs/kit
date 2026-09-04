/** @import { RequestEvent } from '@sveltejs/kit' */

export const CONTEXT = Symbol('sveltekit.context');

/** The kinds of code an event gets handed to, and the groups the runtime asks about */
const KINDS = {
	query: 1,
	prerender: 2,
	form: 4,
	command: 8,
	render: 16,
	mutation: 4 | 8,
	remote: 1 | 2 | 4 | 8
};

/** @typedef {keyof typeof KINDS} Kind */

/**
 * One shared prototype per set of flags. It carries the flags and, for queries, the guards on
 * `url`, `params` and `route`, so a spread of a view drops both and `inside` fails loudly
 * @type {object[]}
 */
const prototypes = [];

/**
 * @param {number} flags
 * @returns {object}
 */
function prototype_for(flags) {
	return (prototypes[flags] ??= create_prototype(flags));
}

/**
 * @param {number} flags
 * @returns {object}
 */
function create_prototype(flags) {
	const prototype = {};

	guard(prototype, CONTEXT, () => flags);

	if (flags & KINDS.query) {
		for (const property of /** @type {const} */ (['url', 'params', 'route'])) {
			guard(prototype, property, () => {
				throw new Error(
					`Cannot access event.${property} in a query. Pass the value as an argument to the query instead`
				);
			});
		}
	}

	return prototype;
}

/**
 * A getter with a no-op setter, so that `Object.assign` skips the key instead of shadowing it
 * @param {object} prototype
 * @param {string | symbol} key
 * @param {() => any} get
 */
function guard(prototype, key, get) {
	Object.defineProperty(prototype, key, { get, set() {} });
}

/**
 * @param {RequestEvent} event
 * @returns {number | undefined}
 */
function get_flags(event) {
	return /** @type {Record<symbol, number | undefined>} */ (/** @type {unknown} */ (event))[
		CONTEXT
	];
}

/**
 * @param {RequestEvent} event
 * @param {Kind} kind
 * @returns {boolean}
 */
export function inside(event, kind) {
	const flags = get_flags(event);

	if (flags === undefined) {
		throw new Error('The event was copied without `derive_event`, so its context is lost');
	}

	return (flags & KINDS[kind]) !== 0;
}

/**
 * The only way to copy an event. Returns a view for the given kind of code, minus what that
 * kind may not do, with the kinds already on the stack carried along
 * @param {RequestEvent} event
 * @param {Kind | null} kind
 * @param {Partial<RequestEvent>} [overrides]
 * @returns {RequestEvent}
 */
export function derive_event(event, kind, overrides) {
	const entering = kind ? KINDS[kind] : 0;
	// no context means an event a user built by hand for `resolve`
	const flags = (get_flags(event) ?? 0) | entering;

	return Object.assign(
		Object.create(prototype_for(flags)),
		event,
		overrides,
		entering & KINDS.remote ? restrictions(event, flags) : null
	);
}

/**
 * What remote functions may not do with the event
 * @param {RequestEvent} event
 * @param {number} flags
 * @returns {Partial<RequestEvent>}
 */
function restrictions({ cookies }, flags) {
	const read_only = flags & (KINDS.query | KINDS.prerender);

	/**
	 * @param {'set' | 'delete'} verb
	 * @param {import('cookie').SerializeOptions} opts
	 */
	const check = (verb, opts) => {
		if (read_only)
			throw new Error(`Cannot ${verb} cookies in \`query\` or \`prerender\` functions`);
		if (opts.path && !opts.path.startsWith('/')) {
			throw new Error('Cookies in remote functions must have an absolute path');
		}
	};

	return {
		setHeaders: () => {
			throw new Error('setHeaders is not allowed in remote functions');
		},
		cookies: {
			...cookies,
			set: (name, value, opts) => {
				check('set', opts);
				return cookies.set(name, value, opts);
			},
			delete: (name, opts) => {
				check('delete', opts);
				return cookies.delete(name, opts);
			}
		}
	};
}
