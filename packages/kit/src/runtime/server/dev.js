const symbol = Symbol.for('sveltekit.global_state');
const state = /** @type {Record<symbol, any>} */ (
	/** @type {Record<symbol, unknown>} */ (/** @type {unknown} */ (globalThis))[symbol] ??= {}
);

/**
 * Persist a value across dev server reloads, in case a freshly-invalidated module
 * reads global state that is not set until a request is handled
 * @param {symbol} key
 * @param {any} value
 */
export function save(key, value) {
	state[key] = value;
}

/**
 * Restore a value after a dev server reload
 * @param {symbol} key
 */
export function restore(key) {
	return state[key];
}
