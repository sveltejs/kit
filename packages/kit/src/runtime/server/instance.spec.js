import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { restore, save } from './dev.js';
import { respond as handle } from './respond.js';

vi.mock('esm-env', () => ({ DEV: true }));
vi.mock('./respond.js', () => ({ respond: vi.fn() }));
vi.mock('./state.js', () => ({ create_request_state: () => ({}) }));
vi.mock('./internal.js', () => ({
	set_hooks: vi.fn(),
	fix_stack_trace: (/** @type {Error} */ error) => error
}));
vi.mock('@sveltejs/kit/internal/server', () => ({ init_tracing: vi.fn() }));
vi.mock('#app/internal/transport', () => ({ init_transport: vi.fn() }));
vi.mock('<sveltekit:generated>/env/config.js', () => ({ set_env: vi.fn() }));

const key = Symbol.for('sveltekit.unpatched_fetch');
/** @type {typeof globalThis.fetch | undefined} */
let previous_fetch;

beforeEach(() => {
	previous_fetch = restore(key);
	save(key, undefined);
	vi.resetModules();
});

afterEach(() => {
	save(key, previous_fetch);
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

test('reloads replace the fetch wrapper without calling previous wrappers', async () => {
	const original = vi.fn(() => Promise.resolve(new Response('hello')));
	vi.stubGlobal('fetch', original);

	for (let i = 0; i < 3; i += 1) {
		await import('./instance.js');
		const previous = vi.fn(globalThis.fetch);
		globalThis.fetch = previous;
		vi.resetModules();
		await import('./instance.js');

		const info = new URL('https://example.com');
		const init = { method: 'POST', body: 'hello' };
		expect(await (await fetch(info, init)).text()).toBe('hello');
		expect(previous).not.toHaveBeenCalled();
		expect(original).toHaveBeenLastCalledWith(info, init);
	}

	expect(original).toHaveBeenCalledTimes(3);
});

test('decoded response diagnostics use the current server instance after reloads', async () => {
	const original = vi.fn(() =>
		Promise.resolve(
			new Response('hello', {
				headers: { 'content-encoding': 'gzip' }
			})
		)
	);
	vi.stubGlobal('fetch', original);
	const log = vi.spyOn(console, 'error').mockImplementation(() => {});

	for (let i = 0; i < 3; i += 1) {
		vi.resetModules();
		const server = await import('./instance.js');
		const response = await fetch('https://example.com');
		vi.mocked(handle).mockResolvedValue(response);

		expect(
			await server.respond(new Request('https://example.com'), {
				read: () => Buffer.from(''),
				getClientAddress: () => '127.0.0.1'
			})
		).toBe(response);
		expect(log).toHaveBeenCalledTimes(i + 1);
		expect(log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('Content-Encoding: gzip')
			})
		);
	}

	expect(original).toHaveBeenCalledTimes(3);
});
