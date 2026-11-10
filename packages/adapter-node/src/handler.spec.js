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

test('rejects requests with an unsupported scheme in the protocol header', async () => {
	vi.resetModules();
	vi.stubEnv('PROTOCOL_HEADER', 'x-forwarded-proto');
	const { handler: dynamic_handler } = await import('./handler.js');
	const console_error = vi.spyOn(console, 'error').mockImplementation(() => {});
	onTestFinished(() => {
		console_error.mockRestore();
		vi.unstubAllEnvs();
	});

	const server = createServer((req, res) => dynamic_handler(req, res, () => {}));
	onTestFinished(() => server[Symbol.asyncDispose]());

	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());

	const response = await fetch(`http://127.0.0.1:${port}/page`, {
		headers: {
			'x-forwarded-proto': 'gopher',
			host: 'example.com'
		}
	});

	expect(response.status).toBe(400);
	expect(await response.text()).toBe('Bad Request');
	expect(console_error).toHaveBeenCalledWith(
		'Could not determine request origin: The x-forwarded-proto header specified gopher, which is not supported. It should be `http` or `https`'
	);
});
