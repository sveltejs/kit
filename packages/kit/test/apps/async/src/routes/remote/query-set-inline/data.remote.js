import { query } from '$app/server';

/** @type {ReadonlyMap<string, string>} */
const THINGS = new Map([
	['1', 'one'],
	['2', 'two'],
	['3', 'three']
]);

export const get_thing = query('unchecked', (/** @type {string} */ id) => {
	return THINGS.get(id);
});

export const get_things = query(async () => {
	const ids = [...THINGS.keys()];

	// populate the individual `get_thing(id)` queries via `.set()` so the client
	// can reuse them during hydration without additional network calls
	for (const id of ids) {
		get_thing(id).set(THINGS.get(id));
	}

	return ids;
});

export const get_things_refresh = query(async () => {
	const ids = [...THINGS.keys()];

	// same as above, but using `.refresh()` instead of `.set()`
	for (const id of ids) {
		get_thing(id).refresh();
	}

	return ids;
});
