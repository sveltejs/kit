/** @import { Cookies, RequestEvent as Interface } from '@sveltejs/kit' */
/** @import { Span } from '@opentelemetry/api' */
/** @import { RequestStore } from 'types' */
/** @import { AsyncLocalStorage } from 'node:async_hooks' */
import { DEV } from 'esm-env';
import { IN_WEBCONTAINER } from '../../../constants.js';

/** The kinds of code an event gets handed to, and the groups the runtime asks about */
export const QUERY = 1;
export const PRERENDER = 2;
export const FORM = 4;
export const COMMAND = 8;
export const RENDER = 16;
const REMOTE = QUERY | PRERENDER | FORM | COMMAND;

/** The kinds on the stack, kept under a symbol so it is not part of the public shape */
export const CONTEXT = Symbol('sveltekit.context');

/** @type {Interface['setHeaders']} */
function forbid_set_headers() {
	throw new Error('setHeaders is not allowed in remote functions');
}

/**
 * What remote functions may do with cookies
 * @implements {Cookies}
 */
class RemoteCookies {
	#cookies;
	#flags;

	/**
	 * @param {Cookies} cookies
	 * @param {number} flags the kinds on the stack
	 */
	constructor(cookies, flags) {
		this.#cookies = cookies;
		this.#flags = flags;
	}

	/**
	 * @param {'set' | 'delete'} verb
	 * @param {import('cookie').SerializeOptions} opts
	 */
	#check(verb, opts) {
		if (this.#flags & (QUERY | PRERENDER)) {
			throw new Error(`Cannot ${verb} cookies in \`query\` or \`prerender\` functions`);
		}
		if (opts.path && !opts.path.startsWith('/')) {
			throw new Error('Cookies in remote functions must have an absolute path');
		}
	}

	/** @type {Cookies['get']} */
	get(name, opts) {
		return this.#cookies.get(name, opts);
	}

	/** @type {Cookies['getAll']} */
	getAll(opts) {
		return this.#cookies.getAll(opts);
	}

	/** @type {Cookies['serialize']} */
	serialize(name, value, opts) {
		return this.#cookies.serialize(name, value, opts);
	}

	/** @type {Cookies['parse']} */
	parse(header, opts) {
		return this.#cookies.parse(header, opts);
	}

	/** @type {Cookies['set']} */
	set(name, value, opts) {
		this.#check('set', opts);
		return this.#cookies.set(name, value, opts);
	}

	/** @type {Cookies['delete']} */
	delete(name, opts) {
		this.#check('delete', opts);
		return this.#cookies.delete(name, opts);
	}
}

/**
 * The event as a class, so that a view for a kind of code is a clone with a fixed field list
 * rather than a copy of whatever the source enumerates
 * @implements {Interface}
 */
export class RequestEvent {
	/** @type {number} */
	[CONTEXT];

	/**
	 * @param {Interface} source
	 * @param {number} flags
	 */
	constructor(source, flags) {
		this.cookies = source.cookies;
		this.fetch = source.fetch;
		this.getClientAddress = source.getClientAddress;
		this.locals = source.locals;
		this.platform = source.platform;
		this.request = source.request;
		this.setHeaders = source.setHeaders;
		this.url = source.url;
		this.params = source.params;
		this.route = source.route;
		this.isDataRequest = source.isDataRequest;
		this.isSubRequest = source.isSubRequest;
		this.isRemoteRequest = source.isRemoteRequest;
		this.tracing = source.tracing;
		this[CONTEXT] = flags;
	}

	/**
	 * A traced copy of the event a `handle` hook passes on, which it may have built by hand
	 * @param {Interface} event
	 * @param {Span} current
	 * @returns {RequestEvent}
	 */
	static from(event, current) {
		const view = new RequestEvent(event, 0);
		view.tracing = { ...event.tracing, current };
		return view;
	}

	/** Inside a `query` function, however deep */
	get in_query() {
		return (this[CONTEXT] & QUERY) !== 0;
	}

	/** Inside a `prerender` function, however deep */
	get in_prerender() {
		return (this[CONTEXT] & PRERENDER) !== 0;
	}

	/** Inside a `form` or `command` function */
	get in_mutation() {
		return (this[CONTEXT] & (FORM | COMMAND)) !== 0;
	}

	/** Inside any remote function */
	get in_remote() {
		return (this[CONTEXT] & REMOTE) !== 0;
	}

	/** While the page renders */
	get in_render() {
		return (this[CONTEXT] & RENDER) !== 0;
	}

	/**
	 * The only way to copy an event: a view for the given kind of code, minus what that kind
	 * may not do, with the kinds already on the stack carried along
	 * @param {number} [kind]
	 * @returns {RequestEvent}
	 */
	clone(kind = 0) {
		const flags = this[CONTEXT] | kind;
		const view =
			flags & QUERY
				? /** @type {RequestEvent} */ (new QueryEvent(this, flags))
				: new RequestEvent(this, flags);

		if (kind & REMOTE) {
			view.cookies = new RemoteCookies(this.cookies, flags);
			view.setHeaders = forbid_set_headers;
		}

		return view;
	}

	/**
	 * @param {Span} current
	 * @returns {RequestEvent}
	 */
	traced(current) {
		const view = this.clone();
		view.tracing = { ...this.tracing, current };
		return view;
	}
}

/**
 * A query may not read the page, so a query view never copies it and reads throw. It copies
 * its own field list instead of extending `RequestEvent`, which would run the parent
 * constructor and hand its stores a second shape
 * @implements {Omit<Interface, 'url' | 'params' | 'route'>}
 */
class QueryEvent {
	/** @type {number} */
	[CONTEXT];

	/**
	 * @param {Interface} source
	 * @param {number} flags
	 */
	constructor(source, flags) {
		this.cookies = source.cookies;
		this.fetch = source.fetch;
		this.getClientAddress = source.getClientAddress;
		this.locals = source.locals;
		this.platform = source.platform;
		this.request = source.request;
		this.setHeaders = source.setHeaders;
		this.isDataRequest = source.isDataRequest;
		this.isSubRequest = source.isSubRequest;
		this.isRemoteRequest = source.isRemoteRequest;
		this.tracing = source.tracing;
		this[CONTEXT] = flags;
	}
}

Object.setPrototypeOf(QueryEvent.prototype, RequestEvent.prototype);

for (const property of ['url', 'params', 'route']) {
	Object.defineProperty(QueryEvent.prototype, property, {
		get() {
			throw new Error(
				`Cannot access event.${property} in a query. Pass the value as an argument to the query instead`
			);
		}
	});
}

/** @type {RequestStore | null} */
let sync_store = null;

/** @type {AsyncLocalStorage<RequestStore | null> | null} */
let als;

import('node:async_hooks')
	.then((hooks) => (als = new hooks.AsyncLocalStorage()))
	.catch(() => {
		// can't use AsyncLocalStorage, but can still call getRequestEvent synchronously.
		// this isn't behind `supports` because it's basically just StackBlitz (i.e.
		// in-browser usage) that doesn't support it AFAICT
	});

/**
 * Returns the current `RequestEvent`. Can be used inside server hooks, server `load` functions, actions, and endpoints (and functions called by them).
 *
 * In environments without [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage), this must be called synchronously (i.e. not after an `await`).
 * @since 2.20.0
 *
 * @returns {Interface}
 */
export function getRequestEvent() {
	const event = try_get_request_store()?.event;

	if (!event) {
		let message =
			'Can only read the current request event inside functions invoked during `handle`, such as server `load` functions, actions, endpoints, and other server hooks.';

		if (!als) {
			message +=
				' In environments without `AsyncLocalStorage`, the event must be read synchronously, not after an `await`.';
		}

		throw new Error(message);
	}

	return event;
}

export function get_request_store() {
	const result = try_get_request_store();
	if (!result) {
		let message = 'Could not get the request store.';

		if (als) {
			message += ' This is an internal error.';
		} else {
			message +=
				' In environments without `AsyncLocalStorage`, the request store (used by e.g. remote functions) must be accessed synchronously, not after an `await`.' +
				' If it was accessed synchronously then this is an internal error.';
		}

		throw new Error(message);
	}
	return result;
}

export function try_get_request_store() {
	return sync_store ?? als?.getStore() ?? null;
}

/**
 * @template T
 * @param {RequestStore | null} store
 * @param {() => T} fn
 */
export function with_request_store(store, fn) {
	if (DEV && store && !(store.event instanceof RequestEvent)) {
		throw new Error('The request store only holds events made by `RequestEvent`, never a copy');
	}

	try {
		sync_store = store;
		return als ? als.run(store, fn) : fn();
	} finally {
		// Since AsyncLocalStorage is not working in webcontainers, we don't reset `sync_store`
		// and handle only one request at a time in `src/runtime/server/index.js`.
		if (!IN_WEBCONTAINER) {
			sync_store = null;
		}
	}
}
