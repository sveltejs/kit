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

/**
 * A value that throws on any use. Unlike an accessor, it survives every copy of the view
 * @template {'url' | 'params' | 'route'} K
 * @param {K} property
 * @returns {RequestEvent[K]}
 */
function poison(property) {
	const fail = () => {
		throw new Error(
			`Cannot access event.${property} in a query. Pass the value as an argument to the query instead`
		);
	};

	return /** @type {RequestEvent[K]} */ (
		new Proxy(Object.freeze({}), { get: fail, has: fail, ownKeys: fail, set: fail })
	);
}

/** What a query may not read */
const POISON = { url: poison('url'), params: poison('params'), route: poison('route') };

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

	return /** @type {RequestEvent} */ ({
		...event,
		...overrides,
		...(entering & KINDS.remote ? restrictions(event, flags) : null),
		...(flags & KINDS.query ? POISON : null),
		[CONTEXT]: flags
	});
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
