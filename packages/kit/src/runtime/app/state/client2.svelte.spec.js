import { beforeEach, describe, expect, test, vi } from 'vitest';
import { tick } from 'svelte';
import { run } from './test/compiled-await.js';
import { reset_updated, updated } from './client.svelte.js';

// Separate file from client.svelte.spec.js because that one mocks `DEV: false`
vi.mock('esm-env', () => ({
	BROWSER: true,
	DEV: true // `await_reactivity_loss` only happens in dev mode
}));

vi.hoisted(() => {
	vi.stubGlobal('__SVELTEKIT_APP_VERSION_CHECKS_ENABLED__', true);
	vi.stubGlobal('__SVELTEKIT_APP_VERSION_FILE__', '_app/version.json');
	vi.stubGlobal('__SVELTEKIT_APP_VERSION_POLL_INTERVAL__', 0);
});

describe('notify_version', () => {
	beforeEach(reset_updated);

	test('does not emit await_reactivity_loss after an await', async () => {
		const warn = vi.spyOn(console, 'warn');

		const { cleanup, ready } = run('track_reactivity_loss');

		await tick();
		await ready;

		cleanup();

		const loss_warnings = warn.mock.calls.filter((args) =>
			String(args[0]).includes('await_reactivity_loss')
		);
		expect(loss_warnings).toEqual([]);
		expect(updated.current).toBe(true);

		warn.mockRestore();
	});

	test('does not throw in a restored reaction context', async () => {
		const { cleanup, ready } = run('save');

		await tick();
		await ready;

		cleanup();

		expect(updated.current).toBe(true);
	});
});
