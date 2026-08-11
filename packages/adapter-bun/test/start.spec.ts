import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
	vi.resetModules();
	vi.doUnmock('node:fs');
	vi.doUnmock('node:process');
	vi.doUnmock('MANIFEST');
	vi.doUnmock('ROUTES');
	vi.doUnmock('SERVER_OPTIONS');
	vi.doUnmock('../src/handler.js');
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

test('starts Bun with production defaults and generated request routes', async () => {
	const loaded = await load_start();

	expect(loaded.serve).toHaveBeenCalledWith(
		expect.objectContaining({
			development: false,
			maxRequestBodySize: 512 * 1024,
			fetch: loaded.handler,
			routes: loaded.routes
		})
	);
	expect(loaded.log).toHaveBeenCalledWith('Listening on http://localhost:3000/');
});

test('environment variables override TCP server defaults', async () => {
	const loaded = await load_start({
		serverOptions: {
			hostname: 'default-host',
			port: 3000,
			reusePort: false,
			ipv6Only: false,
			idleTimeout: 10,
			maxRequestBodySize: 1000,
			development: false
		},
		env: {
			APP_HOST: '127.0.0.1',
			APP_PORT: '4000',
			APP_REUSE_PORT: 'true',
			APP_IPV6_ONLY: 'yes',
			APP_CONNECTION_IDLE_TIMEOUT: '30',
			APP_BODY_SIZE_LIMIT: '2M',
			APP_DEVELOPMENT: 'on'
		},
		envPrefix: 'APP_'
	});

	expect(loaded.serve).toHaveBeenCalledWith(
		expect.objectContaining({
			hostname: '127.0.0.1',
			port: '4000',
			reusePort: true,
			ipv6Only: true,
			idleTimeout: 30,
			maxRequestBodySize: 2 * 1024 * 1024,
			development: true
		})
	);
});

test('a Unix socket takes precedence over TCP-only options', async () => {
	const loaded = await load_start({
		serverOptions: {
			hostname: 'default-host',
			port: 3000,
			reusePort: true,
			ipv6Only: true
		},
		env: { SOCKET_PATH: '/tmp/application.sock' }
	});

	const options = loaded.serve.mock.calls[0][0];
	expect(options.unix).toBe('/tmp/application.sock');
	expect(options).not.toHaveProperty('hostname');
	expect(options).not.toHaveProperty('port');
	expect(options).not.toHaveProperty('reusePort');
	expect(options).not.toHaveProperty('ipv6Only');
	expect(loaded.log).toHaveBeenCalledWith('Listening on /tmp/application.sock');
});

test('removes a stale socket file before listening', async () => {
	const statSync = vi.fn(() => ({ size: 0 }));
	const rmSync = vi.fn();
	vi.doMock('node:fs', () => ({ default: { statSync, rmSync } }));

	await load_start({ env: { SOCKET_PATH: '/tmp/application.sock' } });

	expect(rmSync).toHaveBeenCalledWith('/tmp/application.sock');
});

test.each([
	[{ CONNECTION_IDLE_TIMEOUT: '256' }, 'between 0 and 255'],
	[{ BODY_SIZE_LIMIT: '1.1' }, 'whole bytes'],
	[{ DEVELOPMENT: 'sometimes' }, 'expected a boolean']
])('rejects invalid startup environment %j', async (env, message) => {
	await expect(load_start({ env })).rejects.toThrow(message);
});

test.each(['SIGINT', 'SIGTERM'] as const)(
	'gracefully stops the server and emits sveltekit:shutdown for %s',
	async (signal) => {
		const loaded = await load_start({ pendingRequests: 2 });

		await loaded.listeners.get(signal)?.();

		expect(loaded.stop).toHaveBeenCalledOnce();
		expect(loaded.emit).toHaveBeenCalledWith('sveltekit:shutdown', signal);
		expect(loaded.log).toHaveBeenCalledWith(
			'Waiting for 2 requests to finish before shutting down...'
		);
	}
);

test('force-closes lingering connections after SHUTDOWN_TIMEOUT', async () => {
	vi.useFakeTimers();
	try {
		const loaded = await load_start({
			env: { SHUTDOWN_TIMEOUT: '5' },
			stop: () => new Promise<void>(() => {})
		});

		const shutdown = loaded.listeners.get('SIGTERM')?.();
		await vi.advanceTimersByTimeAsync(5000);
		expect(loaded.stop).toHaveBeenCalledTimes(2);
		expect(loaded.stop).toHaveBeenLastCalledWith(true);
		expect(loaded.emit).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1000);
		await shutdown;
		expect(loaded.emit).toHaveBeenCalledWith('sveltekit:shutdown', 'SIGTERM');
	} finally {
		vi.useRealTimers();
	}
});

test('a second shutdown signal forces the process to exit', async () => {
	let finish_stop: (() => void) | undefined;
	const loaded = await load_start({
		stop: () => new Promise<void>((resolve) => (finish_stop = resolve))
	});

	const first = loaded.listeners.get('SIGINT')?.();
	await loaded.listeners.get('SIGTERM')?.();
	expect(loaded.exit).toHaveBeenCalledWith(1);

	finish_stop?.();
	await first;
});

async function load_start({
	serverOptions = {},
	env = {},
	envPrefix = '',
	pendingRequests = 0,
	stop: stop_implementation
}: {
	serverOptions?: Record<string, unknown>;
	env?: Record<string, string>;
	envPrefix?: string;
	pendingRequests?: number;
	stop?: () => Promise<void>;
} = {}) {
	vi.resetModules();
	const listeners = new Map<string, () => Promise<void> | void>();
	const emit = vi.fn();
	const exit = vi.fn();
	const fake_process = {
		env,
		on: vi.fn((name: string, callback: () => Promise<void> | void) =>
			listeners.set(name, callback)
		),
		emit,
		exit
	};
	vi.doMock('node:process', () => ({ default: fake_process }));
	vi.doMock('MANIFEST', () => ({ env_prefix: envPrefix }));

	const routes = { '/asset': { GET: new Response('asset') } };
	const handler = vi.fn();
	vi.doMock('ROUTES', () => ({ routes }));
	vi.doMock('SERVER_OPTIONS', () => ({ default: serverOptions }));
	vi.doMock('../src/handler.js', () => ({ handler }));

	const stop = vi.fn(stop_implementation ?? (async () => {}));
	const server = {
		url: new URL('http://localhost:3000'),
		pendingRequests,
		stop
	};
	const serve = vi.fn((_options: any) => server);
	vi.stubGlobal('Bun', { serve });
	const log = vi.spyOn(console, 'log').mockImplementation(() => {});

	await import('../src/index.js');

	return { listeners, emit, exit, routes, handler, stop, serve, log };
}
