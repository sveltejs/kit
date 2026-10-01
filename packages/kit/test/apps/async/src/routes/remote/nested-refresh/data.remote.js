import { command, getRequestEvent, query } from '$app/server';

// Per-session state so parallel test workers don't clobber each other.
/** @type {Map<string, { a: number, b: number }>} */
const sessions = new Map();

function session() {
	const id = getRequestEvent().cookies.get('session') ?? 'nested-refresh-default';
	let state = sessions.get(id);
	if (!state) {
		state = { a: 0, b: 0 };
		sessions.set(id, state);
	}
	return state;
}

export const get_a = query(() => {
	// Reading `a` triggers a refresh of `b`. When `get_a` is run *lazily* at the
	// end of the request (because a command called `get_a().refresh()`), this
	// `get_b().refresh()` adds a new entry to `state.remote.explicit` after the
	// collection loop's first sweep — so `collect_remote_data` must keep sweeping
	// to pick it up, otherwise `b` is dropped from the single-flight response.
	get_b().refresh();
	return session().a;
});

export const get_b = query(() => session().b);

export const bump = command('unchecked', (/** @type {number} */ n) => {
	const state = session();
	state.a = n;
	state.b = n * 10;
	get_a().refresh();
	return n;
});
