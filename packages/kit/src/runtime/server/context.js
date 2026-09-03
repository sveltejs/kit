/** @import { RequestEvent } from '@sveltejs/kit' */

const CONTEXT = Symbol('sveltekit.context');

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

// a query may not read the URL. The getters that say so live on a prototype: redefining them on
// each view would drop it into dictionary mode, and the no-op setters make the copy skip those keys
const QUERY_PROTOTYPE = {};
for (const property of ['url', 'params', 'route']) {
	Object.defineProperty(QUERY_PROTOTYPE, property, {
		get() {
			throw new Error(
				`Cannot access event.${property} in a query. Pass the value as an argument to the query instead`
			);
		},
		set() {}
	});
}

/**
 * @param {RequestEvent} event
 * @returns {number}
 */
function get_flags(event) {
	return (
		/** @type {Record<symbol, number | undefined>} */ (/** @type {unknown} */ (event))[CONTEXT] ?? 0
	);
}

/**
 * @param {RequestEvent} event
 * @param {Kind} kind
 * @returns {boolean}
 */
export function inside(event, kind) {
	return (get_flags(event) & KINDS[kind]) !== 0;
}

/**
 * A view of the event for the given kind of code, minus what that kind may not do.
 * The kinds on the stack ride along under a symbol so that nested views accumulate them
 * @param {RequestEvent} event
 * @param {Kind | null} kind
 * @param {Partial<RequestEvent>} [overrides]
 * @returns {RequestEvent}
 */
export function derive_event(event, kind, overrides) {
	const entering = kind ? KINDS[kind] : 0;
	const flags = get_flags(event) | entering;
	const prototype = flags & KINDS.query ? QUERY_PROTOTYPE : Object.prototype;

	const derived = Object.assign(
		Object.create(prototype),
		event,
		overrides,
		entering & KINDS.remote ? restrictions(event, flags) : null
	);
	derived[CONTEXT] = flags;

	return derived;
}

/**
 * What remote functions may not do with the event
 * @param {RequestEvent} event
 * @param {number} flags
 * @returns {Partial<RequestEvent>}
 */
function restrictions({ cookies }, flags) {
	const read_only = flags & (KINDS.query | KINDS.prerender);

	return {
		setHeaders: () => {
			throw new Error('setHeaders is not allowed in remote functions');
		},
		cookies: {
			...cookies,
			set: (name, value, opts) => {
				if (read_only) throw new Error('Cannot set cookies in `query` or `prerender` functions');
				if (opts.path && !opts.path.startsWith('/')) {
					throw new Error('Cookies set in remote functions must have an absolute path');
				}
				return cookies.set(name, value, opts);
			},
			delete: (name, opts) => {
				if (read_only) throw new Error('Cannot delete cookies in `query` or `prerender` functions');
				if (opts.path && !opts.path.startsWith('/')) {
					throw new Error('Cookies deleted in remote functions must have an absolute path');
				}
				return cookies.delete(name, opts);
			}
		}
	};
}
