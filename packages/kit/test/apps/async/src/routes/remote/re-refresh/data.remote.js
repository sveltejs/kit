import { command, getRequestEvent, query } from '$app/server';

// Per-session state so parallel test workers don't clobber each other.
/** @type {Map<string, { value: number }>} */
const sessions = new Map();

function session() {
	const id = getRequestEvent().cookies.get('session') ?? 're-refresh-default';
	let state = sessions.get(id);
	if (!state) {
		state = { value: 0 };
		sessions.set(id, state);
	}
	return state;
}

export const get_value = query(() => session().value);

// A second query that, when it runs during collection, mutates the value and
// re-refreshes `get_value`.
export const driver = query(() => {
	session().value += 1;
	get_value().refresh();
	return true;
});

export const bump = command('unchecked', () => {
	session().value = 10;
	// Both are refreshed by the command, so both run during `collect_remote_data`.
	// `get_value` runs (sees 10), and `driver` runs — bumping the value to 11 and
	// re-refreshing `get_value`. Because `get_value` was already processed this
	// drain, the re-refresh is cached rather than re-run, so the serialized value
	// stays 10. This is the same mechanism that breaks A → B → A refresh cycles.
	get_value().refresh();
	driver().refresh();
	return true;
});
