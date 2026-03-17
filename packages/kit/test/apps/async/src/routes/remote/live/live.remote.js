import { command, query } from '$app/server';

let count = 0;
let drop_next = false;
let active_connections = 0;
let cleanup_count = 0;

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
	for (const listener of listeners) {
		listener();
	}

	listeners.clear();
}

export const get_count = query.live(async function* () {
	active_connections += 1;

	try {
		yield count;

		while (true) {
			await new Promise((resolve) => listeners.add(resolve));

			if (drop_next) {
				drop_next = false;
				return;
			}

			yield count;
		}
	} finally {
		active_connections -= 1;
		cleanup_count += 1;
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

export const drop = command(() => {
	drop_next = true;
	notify();
});

export const get_stats = query(() => {
	return {
		active_connections,
		cleanup_count,
		count
	};
});
