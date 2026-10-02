import { command, form, getRequestEvent, query, requested } from '$app/server';

// `count` is stored per browser session (keyed by the `count_session` cookie set
// in `hooks.server.js`) so that tests running in parallel against the same server
// — e.g. test.js reading the SSR value while client.test.js increments — don't
// clobber each other. The connection counters below remain global because they're
// only asserted relatively (and within a single, serial test file).
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

let drop_next = false;
let active_connections = 0;
let cleanup_count = 0;
let finite_connection_count = 0;
let requested_reconnect_count = 0;

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
	// capture the session id once; getRequestEvent() may not be available after awaits
	const id = session_id();

	active_connections += 1;

	try {
		yield counts.get(id) ?? 0;

		while (true) {
			const status = await wait_for_change(signal);

			if (status === 'aborted') {
				return;
			}

			if (drop_next) {
				drop_next = false;
				throw new Error('stream dropped');
			}

			yield counts.get(id) ?? 0;
		}
	} finally {
		active_connections -= 1;
		cleanup_count += 1;
	}
});

export const get_finite_count = query.live(async function* () {
	finite_connection_count += 1;
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
	drop_next = true;
	notify();
});

export const reconnect_live = command(() => {
	get_count().reconnect();
});

export const reconnect_requested_live = command(async () => {
	await requested(get_count, 5).reconnectAll();
	requested_reconnect_count += 1;
});

export const reconnect_live_form = form('unchecked', async () => {
	get_count().reconnect();
});

export const get_stats = query(() => {
	return {
		active_connections,
		cleanup_count,
		finite_connection_count,
		requested_reconnect_count,
		count: get_count_value()
	};
});
