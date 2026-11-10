/** @import { CloudflareWorkersModule } from '@cloudflare/workers-types/experimental/index.js'; */
// what cloudflare:workers resolves to outside workerd, where bindings do not exist so using them throws

/** @typedef {typeof CloudflareWorkersModule} Module */

/** @returns {never} */
function unavailable() {
	throw new Error(`Cannot access cloudflare:workers in a prerenderable route`);
}

export const env = new Proxy(
	{},
	{
		get: unavailable,
		set: unavailable,
		has: unavailable,
		ownKeys: unavailable,
		deleteProperty: unavailable,
		defineProperty: unavailable,
		getOwnPropertyDescriptor: unavailable
	}
);

/** @type {Module['withEnv']} */
export function withEnv() {
	return unavailable();
}

/** @type {Module['withEnvAndExports']} */
export function withEnvAndExports() {
	return unavailable();
}

export const exports = new Proxy({}, { get: unavailable, has: unavailable });

// no-ops
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
