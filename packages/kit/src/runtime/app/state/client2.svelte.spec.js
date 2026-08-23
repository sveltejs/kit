import { describe, expect, test, vi } from 'vitest';
import { tick } from 'svelte';
import { run } from './compiled-await.js';

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
	test('notify_version does not emit await_reactivity_loss after an await', async () => {
		const warn = vi.spyOn(console, 'warn');

		const { cleanup, ready } = run();

		await tick();
		await ready;

		cleanup();

		expect(warn.mock.calls.length).toBe(0);
	});
});
