import { flushSync, tick } from 'svelte';
import { expect, test, vi } from 'vitest';

// Mock `client.js` because the real one pulls in the SvelteKit
// router/hydration machinery. Creating form instances needs none of it.
vi.mock(new URL('../client.js', import.meta.url).pathname, () => ({
	query_responses: {},
	_goto: () => {},
	set_nearest_error_page: () => {},
	handle_error: () => {},
	refreshAll: () => {}
}));

const { form } = await import('./form.svelte.js');

test('form.for keeps its instance when the derived that holds it reconnects', async () => {
	const remote = form('id');
	let connected = $state(true);
	/** @type {unknown} */
	let held;

	const cleanup = $effect.root(() => {
		const instance = $derived(remote.for('key'));

		$effect(() => {
			if (connected) held = instance;
		});
	});

	try {
		flushSync();

		// the derived loses its last reaction, which freezes the effects created inside it
		connected = false;
		flushSync();
		await tick();

		// reading it again reconnects the derived and reruns those effects
		connected = true;
		flushSync();
		await tick();

		expect(remote.for('key') === held).toBe(true);
	} finally {
		cleanup();
	}
});
