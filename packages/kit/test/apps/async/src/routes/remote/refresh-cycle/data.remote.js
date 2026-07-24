import { command, getRequestEvent, query } from '$app/server';

// Per-session state so parallel test workers don't clobber each other.
/** @type {Map<string, { value: number }>} */
const sessions = new Map();

function session() {
	const id = getRequestEvent().cookies.get('count_session') ?? 'refresh-cycle-default';
	let state = sessions.get(id);
	if (!state) {
		state = { value: 0 };
		sessions.set(id, state);
	}
	return state;
}

// A refreshes B, B refreshes A — a cycle. Without cycle detection in
// `collect_remote_data`'s drain, the command response never settles.
export const get_a = query(() => {
	get_b().refresh();
	return session().value;
});

export const get_b = query(() => {
	get_a().refresh();
	return session().value;
});

export const bump = command('unchecked', () => {
	session().value += 1;
	get_a().refresh();
	return true;
});
