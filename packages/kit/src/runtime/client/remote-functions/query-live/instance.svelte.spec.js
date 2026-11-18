import { expect, test, vi } from 'vitest';
import { tick } from 'svelte';
import { LiveQuery } from './instance.svelte.js';

// The instance only needs the SSR response cache, not the client router.
vi.mock(new URL('../../client.js', import.meta.url).pathname, () => ({
	query_responses: {},
	handle_error: vi.fn()
}));

vi.mock(new URL('./iterator.js', import.meta.url).pathname, () => ({
	/**
	 * @param {string} _id
	 * @param {string} _payload
	 * @param {AbortController} _controller
	 * @param {() => void} on_connect
	 */
	async *create_live_iterator(_id, _payload, _controller, on_connect) {
		await Promise.resolve();
		on_connect();
		yield 0;
	}
}));

test('reconnecting a finite query in an effect does not track its internal state', async () => {
	const query = new LiveQuery('q', 'q', '');
	await vi.waitFor(() => expect(query.done).toBe(true));

	let runs = 0;
	const destroy = $effect.root(() => {
		$effect.pre(() => {
			runs += 1;
			// Bound the number of restarts if reconnect() accidentally tracks `done`.
			if (runs < 3) void query.reconnect();
		});
	});

	try {
		await tick();
		await vi.waitFor(() => expect(query.done).toBe(true));
		await tick();
		expect(runs).toBe(1);
	} finally {
		destroy();
		query.destroy();
	}
});
