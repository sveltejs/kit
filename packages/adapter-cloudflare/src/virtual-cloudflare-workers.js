/** @import { CloudflareWorkersModule } from '@cloudflare/workers-types/experimental/index.js'; */
// what cloudflare:workers resolves to outside workerd, where only text, json and secret bindings have values
import process from 'node:process';
import { BINDINGS_ENV_KEY } from '../utils.js';

/** @typedef {typeof CloudflareWorkersModule} Module */

/**
 * @param {string} name
 * @returns {never}
 */
function unavailable(name) {
	throw new Error(`Cannot call \`${name}\` from cloudflare:workers outside the Workers runtime`);
}

/**
 * A binding that can be passed around outside workerd, such as `drizzle(env.DB)`, but throws when used
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
			`Cannot access \`${String(property)}\` on the \`${name}\` binding outside the Workers runtime. Only text, JSON and secret bindings are available while SvelteKit analyses and prerenders your app`
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
function create_env() {
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

export const env = create_env();

export const exports = new Proxy(
	{},
	{
		get: (_, property) =>
			typeof property === 'symbol' ? undefined : placeholder(`exports.${property}`)
	}
);

/** @type {Module['withEnv']} */
export function withEnv() {
	return unavailable('withEnv');
}

/** @type {Module['withExports']} */
export function withExports() {
	return unavailable('withExports');
}

/** @type {Module['withEnvAndExports']} */
export function withEnvAndExports() {
	return unavailable('withEnvAndExports');
}

/** @returns {never} */
export function abortIsolate() {
	return unavailable('abortIsolate');
}

/** @returns {never} */
export function restore() {
	return unavailable('restore');
}

// inert so that code which extends them can be imported
export class RpcTarget {}
export class RpcStub {}
export class RpcPromise {}
export class RpcProperty {}
export class ServiceStub {}

class Entrypoint {
	/**
	 * @param {unknown} ctx
	 * @param {unknown} env
	 */
	constructor(ctx, env) {
		this.ctx = ctx;
		this.env = env;
	}
}
export class WorkerEntrypoint extends Entrypoint {}
export class DurableObject extends Entrypoint {}
export class WorkflowEntrypoint extends Entrypoint {}

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
