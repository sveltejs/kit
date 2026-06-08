import { command, getRequestEvent, prerender, query } from '$app/server';

let child_calls = 0;

export const get_child = query('unchecked', (/** @type {string} */ id) => {
	child_calls++;
	return { id, value: `child:${id}` };
});

export const get_child_calls = query(() => child_calls);

export const reset_child_calls = command(() => {
	child_calls = 0;
});

// returns a nested query that IS awaited during render, so its value gets seeded
export const get_parent = query('unchecked', (/** @type {string} */ id) => {
	return { id, label: `parent:${id}`, child: get_child(id) };
});

// returns a nested query that is NOT used — only the pointer is serialized, and the client
// fetches the value on use
export const get_parent_unused = query('unchecked', (/** @type {string} */ id) => {
	return { id, child: get_child(`${id}-unused`) };
});

// a command that returns a nested query whose value is seeded via the side-channel
export const create_child = command('unchecked', async (/** @type {string} */ id) => {
	const child = get_child(id);
	await child; // mark as used so its value is seeded into the response
	return { created: id, child };
});

// returns a nested query seeded via `.from(...)`: the query's own function is never invoked,
// but the provided value still travels to the client so the pointer resolves without a fetch
export const get_parent_from = query('unchecked', (/** @type {string} */ id) => {
	return {
		id,
		label: `parent-from:${id}`,
		child: get_child.from(id, { id, value: `seeded:${id}` })
	};
});

// a command that returns a nested query created (and seeded) via `.from(...)`
export const create_child_from = command('unchecked', (/** @type {string} */ id) => {
	return { created: id, child: get_child.from(id, { id, value: `seeded:${id}` }) };
});

// a live query that yields values containing a nested query, seeded per stream message
/** @type {Set<() => void>} */
const live_listeners = new Set();
let live_tick = 0;

export const bump_live = command(() => {
	live_tick += 1;
	for (const listener of live_listeners) listener();
	live_listeners.clear();
});

export const live_with_child = query.live(async function* () {
	const signal = getRequestEvent().request.signal;

	while (true) {
		const tick = live_tick;
		const child = get_child(`live-${tick}`);
		await child; // mark used so its value is seeded into the stream message
		yield { tick, child };

		const changed = await new Promise((resolve) => {
			const on_change = () => {
				signal.removeEventListener('abort', on_abort);
				resolve(true);
			};
			const on_abort = () => {
				live_listeners.delete(on_change);
				resolve(false);
			};
			live_listeners.add(on_change);
			signal.addEventListener('abort', on_abort, { once: true });
		});

		if (!changed) return;
	}
});

const prerender_child = prerender('unchecked', (/** @type {string} */ id) => `pchild:${id}`, {
	dynamic: true
});

export { prerender_child };

// a prerender that returns a nested prerender
export const prerender_parent = prerender(
	'unchecked',
	(/** @type {string} */ id) => {
		return { id, child: prerender_child(id) };
	},
	{ dynamic: true }
);
