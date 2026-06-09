import { command, query } from '$app/server';

/** @type {Set<string>} */
const seen = new Set();
/** @type {Set<string>} */
const notified = new Set();
/** @type {Set<{ key: string, resolve: () => void }>} */
const listeners = new Set();

export const live_value = query.live('unchecked', async function* (key) {
	if (!seen.has(key)) {
		// first connection for this key — the SSR render
		seen.add(key);
		yield 'initial';
		return;
	}

	// subsequent connections (the post-hydration reconnect) don't yield until
	// notified, so that tests can observe the hydration-seeded value
	if (!notified.has(key)) {
		await new Promise((resolve) => listeners.add({ key, resolve }));
	}

	yield 'updated';
});

export const notify = command('unchecked', (/** @type {string} */ key) => {
	notified.add(key);

	for (const listener of [...listeners]) {
		if (listener.key === key) {
			listener.resolve();
			listeners.delete(listener);
		}
	}
});
