import fs from 'node:fs';
import process from 'node:process';
import { afterAll, afterEach, expect, jest, mock, spyOn, test } from 'bun:test';
import { mock_manifest, mock_routes } from './mocks.js';

// the const captures the real module object before any test swaps the live binding
const real_process = process;
let instance = 0;

afterEach(() => {
	jest.useRealTimers();
	mock.restore();
});

afterAll(() => {
	mock.module('node:process', () => ({ default: real_process }));
});

test('starts Bun with production defaults and generated request routes', async () => {
	const loaded = await load_start();

	expect(loaded.serve).toHaveBeenCalledWith(
		expect.objectContaining({
			development: false,
			port: 3000,
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
	spyOn(fs, 'statSync').mockReturnValue({ size: 0 } as ReturnType<typeof fs.statSync>);
	const rm = spyOn(fs, 'rmSync').mockImplementation(() => {});

	await load_start({ env: { SOCKET_PATH: '/tmp/application.sock' } });

	expect(rm).toHaveBeenCalledWith('/tmp/application.sock');
});

test.each([
	[{ CONNECTION_IDLE_TIMEOUT: '256' }, 'between 0 and 255'],
	[{ BODY_SIZE_LIMIT: '1.1' }, 'whole bytes'],
	[{ DEVELOPMENT: 'sometimes' }, 'expected a boolean']
])('rejects invalid startup environment %j', async (env, message) => {
	await expect(load_start({ env })).rejects.toThrow(message);
});

test('refuses to start on a Bun older than 1.4', async () => {
	spyOn(Bun.semver, 'order').mockReturnValue(-1);
	await expect(load_start()).rejects.toThrow('requires Bun 1.4');
});

// every other test proves the guard admits the running Bun; these pin the real
// comparator's verdicts for the release shapes the guard must order correctly,
// canaries being the reason it uses order() rather than satisfies()
test.each([
	['1.3.14', -1],
	['1.4.0', 0],
	['1.4.1', 1],
	['1.5.0-canary.1', 1],
	['2.0.0', 1]
] as const)('Bun.semver orders %s against the 1.4.0 floor as %d', (version, expected) => {
	expect(Bun.semver.order(version, '1.4.0')).toBe(expected);
});

test.each(['SIGINT', 'SIGTERM'] as const)(
	'gracefully stops the server and emits sveltekit:shutdown for %s',
	async (signal) => {
		const loaded = await load_start({ pendingRequests: 2 });

		await loaded.listeners.get(signal)?.();

		expect(loaded.stop).toHaveBeenCalledTimes(1);
		expect(loaded.emit).toHaveBeenCalledWith('sveltekit:shutdown', signal);
		expect(loaded.log).toHaveBeenCalledWith(
			expect.stringContaining('Waiting for 2 requests to finish before shutting down...')
		);
	}
);

test('force-closes lingering connections after SHUTDOWN_TIMEOUT', async () => {
	jest.useFakeTimers();
	try {
		let finish_force: (() => void) | undefined;
		const loaded = await load_start({
			env: { SHUTDOWN_TIMEOUT: '5' },
			stop: (force) =>
				force
					? new Promise<void>((resolve) => (finish_force = resolve))
					: new Promise<void>(() => {})
		});

		const shutdown = loaded.listeners.get('SIGTERM')?.();
		jest.advanceTimersByTime(5000);
		await flush_microtasks();
		expect(loaded.stop).toHaveBeenCalledTimes(2);
		expect(loaded.stop).toHaveBeenLastCalledWith(true);
		expect(loaded.emit).not.toHaveBeenCalled();

		finish_force?.();
		await shutdown;
		expect(loaded.emit).toHaveBeenCalledWith('sveltekit:shutdown', 'SIGTERM');
	} finally {
		jest.useRealTimers();
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

// bun:test has no async advanceTimersByTime, so drain the promise chains that a
// synchronously-fired timer callback unblocks
async function flush_microtasks() {
	for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

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
	stop?: (force?: boolean) => Promise<void>;
} = {}) {
	const listeners = new Map<string, () => Promise<void> | void>();
	const emit = mock((_name: string, _detail: unknown) => {});
	const exit = mock((_code: number) => {});
	const fake_process = {
		env,
		on: mock((name: string, callback: () => Promise<void> | void) => listeners.set(name, callback)),
		emit,
		exit
	};
	mock.module('node:process', () => ({ default: fake_process }));
	mock_manifest({ env_prefix: envPrefix });

	const routes = { '/asset': { GET: new Response('asset') } };
	const handler = mock(() => {});
	mock_routes({ routes });
	mock.module('SERVER_OPTIONS', () => ({ default: serverOptions }));
	mock.module('../src/handler.js', () => ({ handler }));

	const stop = mock(stop_implementation ?? (async () => {}));
	const server = {
		url: new URL('http://localhost:3000'),
		pendingRequests,
		stop
	};
	const serve = spyOn(Bun, 'serve').mockImplementation((_options: any) => server as any);
	const log = spyOn(console, 'log').mockImplementation(() => {});

	await import(`../src/index.js?instance=${++instance}`);

	return { listeners, emit, exit, routes, handler, stop, serve, log };
}
