import { query } from '$app/server';
import { per_session } from '../per-session.js';

const session = per_session(() => ({ counter: 0, times_called: 0 }));

export const get_value = query(() => {
	const state = session();
	state.times_called += 1;
	return state.counter;
});

export const get_call_count = query(() => session().times_called);
