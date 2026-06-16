import { split_remote_key } from '../../shared.js';

/**
 * Groups a flat list of client-requested refresh keys into a map of remote
 * function id to the payloads requested for it.
 * @param {string[] | undefined} refreshes
 * @returns {Map<string, string[]>}
 */
export function create_requested_map(refreshes) {
	/** @type {Map<string, string[]>} */
	const requested = new Map();

	for (const key of refreshes ?? []) {
		const parts = split_remote_key(key);

		const existing = requested.get(parts.id);

		if (existing) {
			existing.push(parts.payload);
		} else {
			requested.set(parts.id, [parts.payload]);
		}
	}

	return requested;
}
