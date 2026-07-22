import { command, getRequestEvent, query } from '$app/server';

// Per-session state so parallel test workers don't clobber each other.
/** @type {Map<string, { value: number }>} */
const sessions = new Map();

function session() {
	const id = getRequestEvent().cookies.get('count_session') ?? 're-refresh-default';
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
	// re-refreshing `get_value`. Because collection consumes entries out of
	// `explicit`, that re-refresh re-inserts `get_value`, which runs again and
	// serializes 11 rather than the stale 10.
	get_value().refresh();
	driver().refresh();
	return true;
});
