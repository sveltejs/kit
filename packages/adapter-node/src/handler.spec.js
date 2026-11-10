import { once } from 'node:events';
import { createServer } from 'node:http';
import { expect, onTestFinished, test, vi } from 'vitest';

const respond = vi.fn();

vi.mock('#@sveltejs/adapter-node', () => ({
	server: { init: () => Promise.resolve(), respond },
	dir: '/nonexistent',
	env_prefix: '',
	base: '',
	app_path: '_app',
	origin: undefined,
	mime_types: {},
	assets: { entries: [], aliases: [] },
	prerendered_assets: { entries: [], aliases: [] }
}));

const { handler } = await import('./handler.js');

/** @param {() => void} next */
async function start(next = () => {}) {
	const server = createServer((req, res) => handler(req, res, next));
	onTestFinished(() => server[Symbol.asyncDispose]());

	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
	return `http://127.0.0.1:${port}`;
}

test('responds with 500 when the server fails to respond', async () => {
	const error = new Error('failed to respond');
	respond.mockRejectedValueOnce(error);
	const console_error = vi.spyOn(console, 'error').mockImplementation(() => {});
	onTestFinished(() => console_error.mockRestore());

	const origin = await start();
	const response = await fetch(`${origin}/page`);

	expect(response.status).toBe(500);
	expect(await response.text()).toBe('Internal Server Error');
	expect(console_error).toHaveBeenCalledWith(error);
});

test('passes successful responses through', async () => {
	respond.mockResolvedValueOnce(new Response('hello', { headers: { 'x-test': 'yes' } }));

	const origin = await start();
	const response = await fetch(`${origin}/page`);

	expect(response.status).toBe(200);
	expect(response.headers.get('x-test')).toBe('yes');
	expect(await response.text()).toBe('hello');
});
