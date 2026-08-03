import { command, form, getRequestEvent, query, requested } from '$app/server';
import { per_session } from '../per-session.js';

// all mutable state is per browser session so tests running in parallel against
// the same server can't clobber each other's counters
const session = per_session(() => ({
	count: 0,
	drop_next: false,
	active_connections: 0,
	cleanup_count: 0,
	finite_connection_count: 0,
	requested_reconnect_count: 0
}));

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
	for (const listener of listeners) {
		listener();
	}

	listeners.clear();
}

/** @param {AbortSignal} signal */
function wait_for_change(signal) {
	return new Promise((resolve) => {
		const on_change = () => {
			signal.removeEventListener('abort', on_abort);
			resolve('changed');
		};

		const on_abort = () => {
			listeners.delete(on_change);
			resolve('aborted');
		};

		listeners.add(on_change);
		signal.addEventListener('abort', on_abort, { once: true });
	});
}

export const get_count = query.live(async function* () {
	const signal = getRequestEvent().request.signal;
	// capture the session once; getRequestEvent() may not be available after awaits
	const state = session();

	state.active_connections += 1;

	try {
		yield state.count;

		while (true) {
			const status = await wait_for_change(signal);

			if (status === 'aborted') {
				return;
			}

			if (state.drop_next) {
				state.drop_next = false;
				throw new Error('stream dropped');
			}

			yield state.count;
		}
	} finally {
		state.active_connections -= 1;
		state.cleanup_count += 1;
	}
});

export const get_finite_count = query.live(async function* () {
	const state = session();
	state.finite_connection_count += 1;
	yield state.count;
});

export const get_duplicate_payload = query.live(async function* () {
	const signal = getRequestEvent().request.signal;
	const state = session();

	yield { count: state.count };

	while (true) {
		const status = await wait_for_change(signal);

		if (status === 'aborted') {
			return;
		}

		yield { count: state.count };
	}
});

export const increment = command(() => {
	session().count += 1;
	notify();
});

export const reset = command(() => {
	session().count = 0;
	notify();
});

export const notify_only = command(() => {
	notify();
});

export const drop = command(() => {
	session().drop_next = true;
	notify();
});

export const reconnect_live = command(() => {
	get_count().reconnect();
});

export const reconnect_requested_live = command(async () => {
	const state = session();
	await requested(get_count, 5).reconnectAll();
	state.requested_reconnect_count += 1;
});

export const reconnect_live_form = form('unchecked', async () => {
	get_count().reconnect();
});

export const get_stats = query(() => session());
