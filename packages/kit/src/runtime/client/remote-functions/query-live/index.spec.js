import { expect, test, vi } from 'vitest';
import { query_live } from './index.js';
import { live_query_map } from '../../client.js';

vi.mock(new URL('../../client.js', import.meta.url).pathname, () => ({
	live_query_map: new Map()
}));

vi.mock(new URL('../shared.svelte.js', import.meta.url).pathname, () => ({
	QUERY_FUNCTION_ID: Symbol('query_function_id')
}));

vi.mock(new URL('./proxy.js', import.meta.url).pathname, () => ({
	LiveQueryProxy: class {}
}));

test('HMR handles rejected live query reconnects', async () => {
	let calls = 0;
	// A plain function is intentional: vi.fn tracks rejected promises itself.
	const reconnect = () => {
		calls += 1;
		return Promise.reject(new Error('Live query connection was interrupted'));
	};
	// Only the reconnect method is used by the HMR path.
	live_query_map.set('live', new Map([['', /** @type {any} */ ({ resource: { reconnect } })]]));

	try {
		query_live('live');
		query_live('live');
		// Allow detached rejections to surface. Vitest fails on unhandled rejections.
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(calls).toBe(2);
	} finally {
		live_query_map.clear();
	}
});
