import { command, form, getRequestEvent, query, requested } from '$app/server';

let count = 0;
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

	active_connections += 1;

	try {
		yield count;

		while (true) {
			const status = await wait_for_change(signal);

			if (status === 'aborted') {
				return;
			}

			if (drop_next) {
				drop_next = false;
				throw new Error('stream dropped');
			}

			yield count;
		}
	} finally {
		active_connections -= 1;
		cleanup_count += 1;
	}
});

export const get_finite_count = query.live(async function* () {
	finite_connection_count += 1;
	yield count;
});

export const get_duplicate_payload = query.live(async function* () {
	const signal = getRequestEvent().request.signal;

	yield { count };

	while (true) {
		const status = await wait_for_change(signal);

		if (status === 'aborted') {
			return;
		}

		yield { count };
	}
});

export const increment = command(() => {
	count += 1;
	notify();
});

export const reset = command(() => {
	count = 0;
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
		count
	};
});
