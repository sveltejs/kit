/**
 * Central registry for mock remote function data.
 * Used by mockRemote() to register mocks, and by the mock remote
 * runtime to look up data during component rendering.
 */

/**
 * @typedef {object} MockConfig
 * @property {any} [data] Result data (queries, commands, form result)
 * @property {{ status: number, body: any }} [error] Error to throw (queries, commands)
 * @property {(arg: any) => any} [resolver] Dynamic resolver function
 * @property {number} [delay] Delay in ms before resolving
 * @property {Record<string, any>} [fieldValues] Form field values
 * @property {Record<string, Array<{ message: string, path?: Array<string | number> }>>} [fieldIssues] Form field validation issues
 */

/** @type {Map<string, MockConfig>} */
const registry = new Map();

/**
 * Gets the existing config for an ID, or creates a new empty one.
 * This allows chainable builders to incrementally add properties.
 *
 * @param {string} id
 * @returns {MockConfig}
 */
export function getOrCreateMock(id) {
	let config = registry.get(id);
	if (!config) {
		config = {};
		registry.set(id, config);
	}
	return config;
}

/**
 * @param {string} id
 * @returns {MockConfig | undefined}
 */
export function getMock(id) {
	return registry.get(id);
}

export function resetMocks() {
	registry.clear();
}
