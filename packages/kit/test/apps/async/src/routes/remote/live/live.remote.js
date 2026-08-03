import { command, form, getRequestEvent, query, requested } from '$app/server';
import { per_session } from '../per-session.js';

// All mutable state is stored per browser session (keyed by the `count_session`
// cookie set in `hooks.server.js`) so that tests running in parallel against the
// same server — e.g. test.js loading this route in the no-js project while
// client.test.js asserts exact counter values — don't clobber each other.
/** @type {Map<string, number>} */
const counts = new Map();

function get_count_value() {
	return counts.get(session_id()) ?? 0;
}

/** @param {number} value */
function set_count_value(value) {
	counts.set(session_id(), value);
}

function session_id() {
	return getRequestEvent().cookies.get('count_session') ?? 'default';
}

const session_stats = per_session(() => ({
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
	const id = session_id();
	const state = session_stats();

	state.active_connections += 1;

	try {
		yield counts.get(id) ?? 0;

		while (true) {
			const status = await wait_for_change(signal);

			if (status === 'aborted') {
				return;
			}

			if (state.drop_next) {
				state.drop_next = false;
				throw new Error('stream dropped');
			}

			yield counts.get(id) ?? 0;
		}
	} finally {
		state.active_connections -= 1;
		state.cleanup_count += 1;
	}
});

export const get_finite_count = query.live(async function* () {
	session_stats().finite_connection_count += 1;
	yield get_count_value();
});

export const get_duplicate_payload = query.live(async function* () {
	const signal = getRequestEvent().request.signal;
	const id = session_id();

	yield { count: counts.get(id) ?? 0 };

	while (true) {
		const status = await wait_for_change(signal);

		if (status === 'aborted') {
			return;
		}

		yield { count: counts.get(id) ?? 0 };
	}
});

export const increment = command(() => {
	set_count_value(get_count_value() + 1);
	notify();
});

export const reset = command(() => {
	set_count_value(0);
	notify();
});

export const notify_only = command(() => {
	notify();
});

export const drop = command(() => {
	session_stats().drop_next = true;
	notify();
});

export const reconnect_live = command(() => {
	get_count().reconnect();
});

export const reconnect_requested_live = command(async () => {
	const state = session_stats();
	await requested(get_count, 5).reconnectAll();
	state.requested_reconnect_count += 1;
});

export const reconnect_live_form = form('unchecked', async () => {
	get_count().reconnect();
});

export const get_stats = query(() => {
	const state = session_stats();
	return {
		active_connections: state.active_connections,
		cleanup_count: state.cleanup_count,
		finite_connection_count: state.finite_connection_count,
		requested_reconnect_count: state.requested_reconnect_count,
		count: get_count_value()
	};
});
