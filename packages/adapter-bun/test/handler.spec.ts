import process from 'node:process';
import { afterEach, expect, test, vi } from 'vitest';

const environment = new Set<string>();

afterEach(() => {
	for (const name of environment) delete process.env[name];
	environment.clear();
	vi.resetModules();
	vi.doUnmock('SERVER');
	vi.doUnmock('MANIFEST');
	vi.doUnmock('ROUTES');
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

test('initializes SvelteKit with Bun environment variables and server-readable assets', async () => {
	const loaded = await load_handler();

	expect(loaded.construct).toHaveBeenCalledWith(loaded.manifest);
	expect(loaded.init).toHaveBeenCalledWith({
		env: loaded.bun_env,
		read: expect.any(Function)
	});
	const { read } = loaded.init.mock.calls[0][0];
	expect(read('asset.txt')).toBe(loaded.stream);
	expect(read('missing.txt')).toBeNull();
});

test('normalizes the request origin from the Host header', async () => {
	const loaded = await load_handler();
	const original = new Request('http://127.0.0.1:3000/path?query=yes', {
		headers: { host: 'public.example:8080' }
	});

	await loaded.handler(original, loaded.bun_server);

	const [request, options] = loaded.respond.mock.calls[0];
	expect(request.url).toBe('https://public.example:8080/path?query=yes');
	expect(options.platform).toEqual({ request: original, server: loaded.bun_server });
	loaded.request_ip.mockReturnValue({ address: '127.0.0.1', port: 5000, family: 'IPv4' });
	expect(options.getClientAddress()).toBe('127.0.0.1');
});

test('uses paths.origin as the trusted request origin when configured', async () => {
	const loaded = await load_handler({ origin: 'https://canonical.example' });

	await loaded.handler(new Request('http://internal/path'), loaded.bun_server);

	expect(loaded.respond.mock.calls[0][0].url).toBe('https://canonical.example/path');
});

test('derives the public origin from configured proxy headers', async () => {
	set_env('APP_PROTOCOL_HEADER', 'x-forwarded-proto');
	set_env('APP_HOST_HEADER', 'x-forwarded-host');
	set_env('APP_PORT_HEADER', 'x-forwarded-port');
	const loaded = await load_handler({ envPrefix: 'APP_' });
	const request = new Request('http://internal/path', {
		headers: {
			'x-forwarded-proto': 'https',
			'x-forwarded-host': 'public.example',
			'x-forwarded-port': '8443'
		}
	});

	await loaded.handler(request, loaded.bun_server);

	expect(loaded.respond.mock.calls[0][0].url).toBe('https://public.example:8443/path');
});

test.each([
	['APP_PROTOCOL_HEADER', 'x-proto', { 'x-proto': 'https%3A' }, 'invalid protocol scheme'],
	['APP_PROTOCOL_HEADER', 'x-proto', { 'x-proto': 'foo' }, 'invalid protocol scheme'],
	['APP_PORT_HEADER', 'x-port', { 'x-port': 'not-a-port' }, 'invalid port']
])('returns 400 for an invalid origin from %s', async (name, value, headers, message) => {
	set_env(name, value);
	const loaded = await load_handler({ envPrefix: 'APP_' });
	const error = vi.spyOn(console, 'error').mockImplementation(() => {});

	const response = await loaded.handler(
		new Request('http://internal/path', { headers }),
		loaded.bun_server
	);

	expect(response.status).toBe(400);
	expect(await response.text()).toBe('Bad Request');
	expect(loaded.respond).not.toHaveBeenCalled();
	expect(error).toHaveBeenCalledWith(expect.stringContaining(message));
});

test('rejects a present but empty Host header', async () => {
	const loaded = await load_handler();
	const error = vi.spyOn(console, 'error').mockImplementation(() => {});
	const request = new Request('http://internal/path');
	request.headers.set('host', '');

	const response = await loaded.handler(request, loaded.bun_server);

	expect(response.status).toBe(400);
	expect(loaded.respond).not.toHaveBeenCalled();
	expect(error).toHaveBeenCalledWith(expect.stringContaining('Could not determine host'));
});

test('falls back past proxy headers that are present but empty', async () => {
	set_env('APP_PROTOCOL_HEADER', 'x-forwarded-proto');
	set_env('APP_HOST_HEADER', 'x-forwarded-host');
	const loaded = await load_handler({ envPrefix: 'APP_' });
	const request = new Request('http://internal/path', {
		headers: { 'x-forwarded-proto': '', 'x-forwarded-host': '' }
	});

	await loaded.handler(request, loaded.bun_server);

	expect(loaded.respond.mock.calls[0][0].url).toBe('https://internal/path');
});

test('reads a configured client address header', async () => {
	set_env('APP_ADDRESS_HEADER', 'true-client-ip');
	const loaded = await load_handler({ envPrefix: 'APP_' });

	await loaded.handler(
		new Request('http://localhost/', { headers: { 'true-client-ip': '203.0.113.10' } }),
		loaded.bun_server
	);

	const get_client_address = loaded.respond.mock.calls[0][1].getClientAddress;
	expect(get_client_address()).toBe('203.0.113.10');
});

test('selects a trusted X-Forwarded-For address from the right', async () => {
	set_env('APP_ADDRESS_HEADER', 'x-forwarded-for');
	set_env('APP_XFF_DEPTH', '2');
	const loaded = await load_handler({ envPrefix: 'APP_' });

	await loaded.handler(
		new Request('http://localhost/', {
			headers: { 'x-forwarded-for': 'spoofed, 203.0.113.10, 10.0.0.2' }
		}),
		loaded.bun_server
	);

	expect(loaded.respond.mock.calls[0][1].getClientAddress()).toBe('203.0.113.10');
});

test('reports absent and too-short forwarded address headers', async () => {
	set_env('APP_ADDRESS_HEADER', 'x-forwarded-for');
	set_env('APP_XFF_DEPTH', '3');
	const loaded = await load_handler({ envPrefix: 'APP_' });

	await loaded.handler(new Request('http://localhost/'), loaded.bun_server);
	let get_client_address = loaded.respond.mock.calls[0][1].getClientAddress;
	expect(() => get_client_address()).toThrow(
		'APP_ADDRESS_HEADER=x-forwarded-for but is absent from request'
	);

	loaded.respond.mockClear();
	await loaded.handler(
		new Request('http://localhost/', { headers: { 'x-forwarded-for': 'client, proxy' } }),
		loaded.bun_server
	);
	get_client_address = loaded.respond.mock.calls[0][1].getClientAddress;
	expect(() => get_client_address()).toThrow('APP_XFF_DEPTH is 3, but only found 2 addresses');
});

test('reports when Bun cannot determine the peer address', async () => {
	const loaded = await load_handler();
	loaded.request_ip.mockReturnValue(null);

	await loaded.handler(new Request('http://localhost/'), loaded.bun_server);

	expect(() => loaded.respond.mock.calls[0][1].getClientAddress()).toThrow(
		'Could not determine client address'
	);
});

test('disables timeouts and proxy buffering for event streams', async () => {
	const loaded = await load_handler({
		response: new Response('data: ready\n\n', {
			headers: { 'content-type': 'text/event-stream; charset=utf-8' }
		})
	});
	const request = new Request('http://localhost/events');

	const response = await loaded.handler(request, loaded.bun_server);

	expect(loaded.timeout).toHaveBeenCalledWith(request, 0);
	expect(response.headers.get('x-accel-buffering')).toBe('no');
});

test('leaves ordinary responses and their timeouts unchanged', async () => {
	const loaded = await load_handler({ response: new Response('ok') });

	const response = await loaded.handler(new Request('http://localhost/'), loaded.bun_server);

	expect(loaded.timeout).not.toHaveBeenCalled();
	expect(response.headers.has('x-accel-buffering')).toBe(false);
});

async function load_handler({
	origin,
	envPrefix = '',
	response = new Response('ok')
}: { origin?: string; envPrefix?: string; response?: Response } = {}) {
	vi.resetModules();
	const manifest = { appDir: '_app' };
	const bun_env = { PUBLIC_VALUE: 'available' };
	const stream = new ReadableStream();
	const asset = { stream: vi.fn(() => stream) };
	const construct = vi.fn();
	const init = vi.fn(async (_options: any) => {});
	const respond = vi.fn(async (_request: Request, _options: any) => response);

	class Server {
		constructor(value: unknown) {
			construct(value);
		}
		init = init;
		respond = respond;
	}

	vi.doMock('SERVER', () => ({ Server }));
	vi.doMock('MANIFEST', () => ({ manifest, origin, env_prefix: envPrefix }));
	vi.doMock('ROUTES', () => ({ server_assets: new Map([['asset.txt', asset]]) }));
	vi.stubGlobal('Bun', { env: bun_env });

	const request_ip = vi.fn((_request: Request): any => ({
		address: '127.0.0.1',
		port: 5000,
		family: 'IPv4'
	}));
	const timeout = vi.fn((_request: Request, _seconds: number) => {});
	const bun_server = { requestIP: request_ip, timeout } as any;
	const { handler } = await import('../src/handler.js');

	return {
		handler,
		manifest,
		bun_env,
		stream,
		construct,
		init,
		respond,
		request_ip,
		timeout,
		bun_server
	};
}

function set_env(name: string, value: string) {
	environment.add(name);
	process.env[name] = value;
}
