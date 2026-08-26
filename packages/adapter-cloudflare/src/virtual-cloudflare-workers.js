import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage();

const proxy = globalThis.__platform_proxy;

function get_current_env() {
	return als.getStore() ?? proxy.env;
}

/** @typedef {typeof import('@cloudflare/workers-types').CloudflareWorkersModule} Module */

export const env = new Proxy(
	{},
	{
		get(_, prop) {
			if (!proxy) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.get(inner, prop);
			}
			return undefined;
		},

		set(_, prop, newValue) {
			if (!proxy) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.set(inner, prop, newValue);
			}
			return true;
		},

		has(_, prop) {
			if (!proxy) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.has(inner, prop);
			}
			return false;
		},

		ownKeys(_) {
			if (!proxy) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.ownKeys(inner);
			}
			return [];
		},

		deleteProperty(_, prop) {
			if (!proxy) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.deleteProperty(inner, prop);
			}
			return true;
		},

		defineProperty(_, prop, attr) {
			if (!proxy) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.defineProperty(inner, prop, attr);
			}
			return true;
		},

		getOwnPropertyDescriptor(_, prop) {
			if (!proxy) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.getOwnPropertyDescriptor(inner, prop);
			}
			return undefined;
		}
	}
);

/** @type {Module['withEnv']} */
export function withEnv(newEnv, fn) {
	if (!proxy) {
		throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
	}
	return als.run(newEnv, fn);
}
/** @type {Module['withEnvAndExports']} */
export function withEnvAndExports(newEnv, _, fn) {
	if (!proxy) {
		throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
	}
	return als.run(newEnv, fn);
}

// no-ops
export const exports = new Proxy(
	{},
	{
		get() {
			throw new Error('exports is not available in dev mode');
		},
		has() {
			throw new Error('exports is not available in dev mode');
		}
	}
);
/** @type {Module['waitUntil']} */
export function waitUntil() {}
/** @type {Module['cache']} */
export const cache = {
	purge() {
		return Promise.resolve({ success: true, errors: [] });
	}
};
class Span {
	get isTraced() {
		return false;
	}
	setAttribute() {
		return this;
	}
	setAttributes() {
		return this;
	}
	end() {}
}
/** @type {Module['tracing']} */
export const tracing = {
	enterSpan(_, callback, ...args) {
		return callback(new Span(), ...args);
	},
	startActiveSpan(_, callback, ...args) {
		return callback(new Span(), ...args);
	},
	startSpan(_) {
		return new Span();
	},
	Span
};
