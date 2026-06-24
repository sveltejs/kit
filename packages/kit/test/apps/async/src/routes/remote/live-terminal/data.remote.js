import { error, redirect } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';

let count = 0;
let mode = 'yield';
let connection_count = 0;

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

export const get_value = query.live(async function* () {
	const signal = getRequestEvent().request.signal;

	connection_count += 1;

	yield count;

	while (true) {
		const status = await wait_for_change(signal);

		if (status === 'aborted') {
			return;
		}

		if (mode === 'error') {
			throw error(418, 'terminal teapot');
		}

		if (mode === 'redirect') {
			redirect(307, '/remote/live-terminal/target');
		}

		yield ++count;
	}
});

export const get_connection_count = query(() => connection_count);

export const trigger = command(
	'unchecked',
	/** @param {string} m */ (m) => {
		mode = m;
		notify();
	}
);
