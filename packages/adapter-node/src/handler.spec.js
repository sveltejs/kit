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
	// a content type Node.js refuses to send, so serving this file throws
	mime_types: { '.txt': 'text/plain\n' },
	assets: {
		entries: [['/broken.txt', { file: 'broken.txt', size: 1, etag: 'x' }]],
		aliases: []
	},
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

test('responds with 500 when serving a static file throws', async () => {
	const console_error = vi.spyOn(console, 'error').mockImplementation(() => {});
	onTestFinished(() => console_error.mockRestore());

	const origin = await start();
	const response = await fetch(`${origin}/broken.txt`);

	expect(response.status).toBe(500);
	expect(await response.text()).toBe('Internal Server Error');
	expect(console_error).toHaveBeenCalledWith(expect.objectContaining({ code: 'ERR_INVALID_CHAR' }));

	// the server is still up for other requests
	respond.mockResolvedValueOnce(new Response('ok'));
	expect((await fetch(`${origin}/page`)).status).toBe(200);
});

test('passes successful responses through', async () => {
	respond.mockResolvedValueOnce(new Response('hello', { headers: { 'x-test': 'yes' } }));

	const origin = await start();
	const response = await fetch(`${origin}/page`);

	expect(response.status).toBe(200);
	expect(response.headers.get('x-test')).toBe('yes');
	expect(await response.text()).toBe('hello');
});

test('applies PORT_HEADER only when the forwarded host has no port', async () => {
	vi.stubEnv('HOST_HEADER', 'x-forwarded-host');
	vi.stubEnv('PORT_HEADER', 'x-forwarded-port');
	onTestFinished(() => {
		vi.unstubAllEnvs();
	});

	// the env vars are read when the handler is loaded
	vi.resetModules();
	const { handler } = await import('./handler.js');

	respond.mockImplementation((request) => new Response(request.url));
	onTestFinished(() => {
		respond.mockReset();
	});

	const server = createServer((req, res) => handler(req, res, () => {}));
	onTestFinished(() => server[Symbol.asyncDispose]());

	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());

	// the host's own port is the one the browser used, so it wins over the forwarded port
	for (const [host, expected] of [
		['example.com', 'https://example.com:8443/page'],
		['example.com:8443', 'https://example.com:8443/page'],
		['example.com:9443', 'https://example.com:9443/page'],
		['[::1]:8443', 'https://[::1]:8443/page']
	]) {
		const response = await fetch(`http://127.0.0.1:${port}/page`, {
			headers: { 'x-forwarded-host': host, 'x-forwarded-port': '8443' }
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe(expected);
	}
});
