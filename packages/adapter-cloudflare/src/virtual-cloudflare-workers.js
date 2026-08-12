import { AsyncLocalStorage } from 'node:async_hooks';
/** @type {boolean} */
let prerendering;
try {
	const { prerendering: prerendering_value } = await import('$app/env/internal');
	console.log(prerendering_value);
	prerendering = prerendering_value;
} catch {
	// this will throw during analysis, which is when prerendering happens
	prerendering = true;
}

const als = new AsyncLocalStorage();

const proxy = globalThis.__platform_proxy;

function get_current_env() {
	return als.getStore() ?? proxy.env;
}

export const env = new Proxy(
	{},
	{
		get(_, prop) {
			if (prerendering) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.get(inner, prop);
			}
			return undefined;
		},

		set(_, prop, newValue) {
			if (prerendering) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.set(inner, prop, newValue);
			}
			return true;
		},

		has(_, prop) {
			if (prerendering) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.has(inner, prop);
			}
			return false;
		},

		ownKeys(_) {
			if (prerendering) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.ownKeys(inner);
			}
			return [];
		},

		deleteProperty(_, prop) {
			if (prerendering) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.deleteProperty(inner, prop);
			}
			return true;
		},

		defineProperty(_, prop, attr) {
			if (prerendering) {
				throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
			}
			const inner = get_current_env();
			if (inner) {
				return Reflect.defineProperty(inner, prop, attr);
			}
			return true;
		},

		getOwnPropertyDescriptor(_, prop) {
			if (prerendering) {
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

/**
 * @param {unknown} newEnv
 * @param {() => unknown} fn
 */
export function withEnv(newEnv, fn) {
	if (prerendering) {
		throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
	}
	return als.run(newEnv, fn);
}
/**
 * @param {unknown} newEnv
 * @param {unknown} newExports
 * @param {() => unknown} fn
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function withEnvAndExports(newEnv, newExports, fn) {
	if (prerendering) {
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
export function waitUntil() {}
export const cache = {
	purge() {}
};
export const tracing = {
	enterSpan() {
		throw new Error('tracing is not available in dev mode');
	},
	startActiveSpan() {
		throw new Error('tracing is not available in dev mode');
	}
};
