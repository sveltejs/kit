/** @import { CloudflareWorkersModule } from '@cloudflare/workers-types/experimental/index.js'; */
import { AsyncLocalStorage } from 'node:async_hooks';
import process from 'node:process';
import { BINDINGS_ENV_KEY } from '../utils.js';

const als = new AsyncLocalStorage();

const proxy = globalThis.__sveltekit_cloudflare_platform;

// there is no platform proxy while SvelteKit analyses and prerenders the build
const build_env = proxy ? undefined : create_build_env();

function get_current_env() {
	return als.getStore() ?? proxy?.env ?? build_env;
}

/**
 * A binding that can be passed around during the build, such as `drizzle(env.DB)`, but throws when used
 * @param {string} name
 * @returns {unknown}
 */
function placeholder(name) {
	/**
	 * @param {string | symbol} property
	 * @returns {never}
	 */
	const fail = (property) => {
		throw new Error(
			`Cannot access \`${String(property)}\` on the \`${name}\` binding during the build. Only vars and secrets are available while SvelteKit analyses and prerenders your app`
		);
	};

	return new Proxy(
		{},
		{
			get(_, property) {
				// logging and awaiting the placeholder read these
				if (typeof property === 'symbol' || property === 'then') return undefined;
				return fail(property);
			},
			set: (_, property) => fail(property),
			has: (_, property) => fail(property)
		}
	);
}

/** @returns {Record<string, unknown>} */
function create_build_env() {
	/** @type {import('../utils.js').SerializedBindings} */
	const bindings = JSON.parse(process.env[BINDINGS_ENV_KEY] ?? '{}');

	/** @type {Record<string, unknown>} */
	const env = {};

	for (const [name, binding] of Object.entries(bindings)) {
		if (binding.type === 'text' || binding.type === 'json') {
			env[name] = binding.value;
		} else if (binding.type === 'secret') {
			Object.defineProperty(env, name, {
				get: () => process.env[name],
				enumerable: true,
				configurable: true
			});
		} else {
			env[name] = placeholder(name);
		}
	}

	return env;
}

/** @typedef {typeof CloudflareWorkersModule} Module */

export const env = new Proxy(
	{},
	{
		get(_, prop) {
			const inner = get_current_env();
			if (inner) {
				return Reflect.get(inner, prop);
			}
			return undefined;
		},

		set(_, prop, newValue) {
			const inner = get_current_env();
			if (inner) {
				return Reflect.set(inner, prop, newValue);
			}
			return true;
		},

		has(_, prop) {
			const inner = get_current_env();
			if (inner) {
				return Reflect.has(inner, prop);
			}
			return false;
		},

		ownKeys(_) {
			const inner = get_current_env();
			if (inner) {
				return Reflect.ownKeys(inner);
			}
			return [];
		},

		deleteProperty(_, prop) {
			const inner = get_current_env();
			if (inner) {
				return Reflect.deleteProperty(inner, prop);
			}
			return true;
		},

		defineProperty(_, prop, attr) {
			const inner = get_current_env();
			if (inner) {
				return Reflect.defineProperty(inner, prop, attr);
			}
			return true;
		},

		getOwnPropertyDescriptor(_, prop) {
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
	return als.run(newEnv, fn);
}
/** @type {Module['withEnvAndExports']} */
export function withEnvAndExports(newEnv, _, fn) {
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
	setStatus() {
		return this;
	}
	updateName() {
		return this;
	}
	end() {}
	recordException() {}
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
	getActiveSpan() {},
	Span
};
