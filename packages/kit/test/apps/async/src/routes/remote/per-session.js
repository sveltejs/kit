import { getRequestEvent } from '$app/server';

/**
 * Returns an accessor for state keyed by the `count_session` cookie from
 * `hooks.server.js`, isolating it per test (and per CI retry).
 * @template T
 * @param {() => T} init
 * @returns {() => T}
 */
export function per_session(init) {
	/** @type {Map<string, T>} */
	const sessions = new Map();

	return () => {
		const id = getRequestEvent().cookies.get('count_session') ?? 'default';
		let state = sessions.get(id);
		if (!state) {
			state = init();
			sessions.set(id, state);
		}
		return state;
	};
}
