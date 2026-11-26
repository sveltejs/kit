import { expect, test, vi } from 'vitest';
import { reset_remote_state } from '@sveltejs/kit/internal/client';

// Load the real `client.js` without calling `start()`. It reads these build-time
// constants at module scope, and its root component needs the generated app.
const globals = /** @type {any} */ (globalThis);
globals.__SVELTEKIT_PAYLOAD__ = undefined;
globals.__SVELTEKIT_EMBEDDED__ = false;
globals.__SVELTEKIT_CLIENT_ROUTING__ = true;
globals.__SVELTEKIT_DEV__ = false;
globals.__SVELTEKIT_HAS_SERVER_LOAD__ = false;
globals.__SVELTEKIT_HAS_UNIVERSAL_LOAD__ = false;
globals.__SVELTEKIT_FORK_PRELOADS__ = false;

vi.mock(new URL('../../components/root.svelte', import.meta.url).pathname, () => ({
	default: {}
}));

const { query_responses, prerender_responses } = await import('../client.js');
const { command } = await import('./command.svelte.js');

test('remote functions name the missing env field before `start()` or `set_remote_env`', () => {
	expect(() => command('hash/mutate')(undefined)).toThrowKitError('remote_env_missing', {
		contains: ['page', 'set_remote_env']
	});
});

test('reset_remote_state clears the responses that hydration would consume', async () => {
	query_responses['hash/getPosts/'] = { v: ['stale'] };
	prerender_responses['hash/getPost/'] = { v: 'stale' };

	await reset_remote_state();

	expect(query_responses).toEqual({});
	expect(prerender_responses).toEqual({});
});
