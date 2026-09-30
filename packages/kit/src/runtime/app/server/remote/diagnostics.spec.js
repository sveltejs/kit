/** @import { RequestStore } from 'types' */
import { beforeEach, expect, test, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { ActionFailure, HttpError, ValidationError } from '@sveltejs/kit/internal';
import {
	getRequestEvent,
	with_request_store,
	init_remote_functions
} from '@sveltejs/kit/internal/server';
import { create_validator, run_remote_function, run_remote_generator } from './shared.js';
import { command } from './command.js';
import { form } from './form.js';
import { stringify_remote_arg } from '../../../shared.js';

const flags = vi.hoisted(() => ({ prerendering: false, DEV: true }));
vi.mock('esm-env', () => ({
	BROWSER: false,
	get DEV() {
		return flags.DEV;
	}
}));
vi.mock('#app/env/server', () => ({
	get prerendering() {
		return flags.prerendering;
	}
}));

vi.stubGlobal('__SVELTEKIT_DEV__', false);
const { query } = await import('./query.js');
const { requested } = await import('./requested.js');

/** @type {RequestStore} */
let store;
beforeEach(() => {
	flags.prerendering = false;
	flags.DEV = true;
	store = /** @type {any} */ ({
		event: {
			request: new Request('http://localhost/page', { method: 'POST' }),
			url: new URL('http://localhost/page'),
			params: {},
			route: { id: '/page' },
			cookies: { set: vi.fn(), delete: vi.fn(), get: () => 'cookie' },
			setHeaders: vi.fn(),
			isRemoteRequest: true
		},
		state: { remote: {} }
	});
});

/** @param {() => any} fn */
function run(fn) {
	return with_request_store(store, fn);
}

/** @param {Record<string, any>} module */
function init(module) {
	init_remote_functions(module, 'src/lib/test.remote.js', 'hash');
}

test('invalid validators throw at declaration, not at invocation', () => {
	expect(() => create_validator({}, () => {})).toThrowKitError('remote_invalid_validator');
});

test.each(['development', 'production'])(
	'remote imports work under plain Node %s conditions',
	(condition) => {
		const shared = new URL('../../../shared.js', import.meta.url).href;
		const server = new URL('./shared.js', import.meta.url).href;
		const code = `
		import { stringify_remote_arg } from ${JSON.stringify(shared)};
		import { create_validator } from ${JSON.stringify(server)};
		const result = [];
		for (const fn of [() => create_validator({}, () => {}), () => stringify_remote_arg(/a/)]) {
			try { fn(); } catch (error) { result.push({ name: error.name, message: error.message }); }
		}
		console.log(JSON.stringify(result));
	`;
		const output = JSON.parse(
			execFileSync(
				process.execPath,
				[`--conditions=${condition}`, '--input-type=module', '-e', code],
				{ encoding: 'utf-8' }
			)
		);
		expect(output[0].message).toContainKitDiagnostic('remote_invalid_validator');
		expect(output[0].name).toBe('SvelteKit error');
		expect(output[1].message).toContainKitDiagnostic('remote_argument_unsupported', {
			url_only: condition === 'production'
		});
		expect(output[1].name).toBe(condition === 'production' ? 'Error' : 'SvelteKit error');
	}
);

test('validator issues retain their class and identity', async () => {
	const issues = [{ message: 'user issue', path: ['name'] }];
	const validate = create_validator({ '~standard': { validate: () => ({ issues }) } }, () => {});
	const error = await Promise.resolve(validate('input')).catch((error) => error);
	expect(error).toBeInstanceOf(ValidationError);
	expect(error.issues).toBe(issues);
	const no_input = create_validator(() => {});
	const unexpected = await Promise.resolve()
		.then(() => no_input('unexpected'))
		.catch((error) => error);
	expect(unexpected).toBeInstanceOf(HttpError);
	expect(unexpected).toMatchObject({ status: 400, body: { message: 'Bad Request' } });
});

test.each(['set', 'delete'])('queries cannot %s cookies', async (operation) => {
	await expect(
		run_remote_function(
			store.event,
			store.state,
			false,
			() => undefined,
			() => {
				const cookies = getRequestEvent().cookies;
				if (operation === 'set') cookies.set('name', 'value', { path: '/' });
				else cookies.delete('name', { path: '/' });
			}
		)
	).rejects.toThrowKitError('remote_cookie_forbidden', { contains: [operation] });
	expect(store.event.cookies.set).not.toHaveBeenCalled();
	expect(store.event.cookies.delete).not.toHaveBeenCalled();
});

test.each(['set', 'delete'])(
	'mutations cannot %s cookies with relative paths',
	async (operation) => {
		await expect(
			run_remote_function(
				store.event,
				store.state,
				true,
				() => undefined,
				() => {
					const cookies = getRequestEvent().cookies;
					if (operation === 'set') cookies.set('name', 'value', { path: 'relative' });
					else cookies.delete('name', { path: 'relative' });
				}
			)
		).rejects.toThrowKitError('remote_cookie_path_relative');
	}
);

test('mutations forward absolute cookie operations and queries can read cookies', async () => {
	await run_remote_function(
		store.event,
		store.state,
		true,
		() => undefined,
		() => {
			const cookies = getRequestEvent().cookies;
			expect(cookies.get('name')).toBe('cookie');
			cookies.set('name', 'value', { path: '/' });
			cookies.delete('name', { path: '/page' });
		}
	);
	expect(store.event.cookies.set).toHaveBeenCalledWith('name', 'value', { path: '/' });
	expect(store.event.cookies.delete).toHaveBeenCalledWith('name', { path: '/page' });
});

test('remote functions cannot set headers', async () => {
	await expect(
		run_remote_function(
			store.event,
			store.state,
			true,
			() => undefined,
			() => getRequestEvent().setHeaders({ test: 'value' })
		)
	).rejects.toThrowKitError('remote_headers_forbidden');
	expect(store.event.setHeaders).not.toHaveBeenCalled();
});

test.each(['url', 'params', 'route'])(
	'queries cannot access event.%s, including nested queries',
	async (property) => {
		store.state = { ...store.state, is_in_remote_query: true };
		await expect(
			run_remote_function(
				store.event,
				store.state,
				false,
				() => undefined,
				() => {
					const event = getRequestEvent();
					return run_remote_function(
						event,
						store.state,
						false,
						() => undefined,
						() => /** @type {any} */ (getRequestEvent())[property]
					);
				}
			)
		).rejects.toThrowKitError('remote_request_property', { contains: [property] });
	}
);

test('live callbacks must return an iterable', async () => {
	const iterator = run_remote_generator(
		store.event,
		store.state,
		false,
		() => undefined,
		() => /** @type {any} */ ({}),
		'live'
	);
	await expect(iterator.next()).rejects.toThrowKitError('remote_query_live_not_iterable', {
		contains: ['live']
	});
});

test('live generators retain request context and clean up when closed', async () => {
	const cleanup = vi.fn();
	const iterator = run_remote_generator(
		store.event,
		store.state,
		false,
		() => undefined,
		function* () {
			try {
				expect(getRequestEvent().cookies.get('name')).toBe('cookie');
				yield 1;
			} finally {
				expect(getRequestEvent().cookies.get('name')).toBe('cookie');
				cleanup();
			}
		},
		'live'
	);
	expect(await iterator.next()).toEqual({ done: false, value: 1 });
	await iterator.return(undefined);
	expect(cleanup).toHaveBeenCalledOnce();
});

test.each(['query', 'prerender'])('commands cannot run inside a %s', (type) => {
	const mutate = command(() => 'result');
	init({ mutate });
	store.state = {
		...store.state,
		is_in_remote_query: type === 'query',
		is_in_remote_prerender: type === 'prerender'
	};
	expect(() => run(() => mutate())).toThrowKitError('remote_command_readonly', {
		contains: ['mutate']
	});
});

test('commands cannot run on GET or during SSR', () => {
	const mutate = command(() => 'result');
	init({ mutate });
	store.event = { ...store.event, request: new Request('http://localhost/') };
	expect(() => run(() => mutate())).toThrowKitError('remote_command_method', {
		contains: ['GET', 'mutate']
	});
	store.event = { ...store.event, request: new Request('http://localhost/', { method: 'POST' }) };
	store.state = { ...store.state, is_in_render: true };
	expect(() => run(() => mutate())).toThrowKitError('remote_command_render', {
		contains: ['mutate']
	});
});

test('server command updates throw without changing the command promise', async () => {
	const mutate = command(() => 'result');
	init({ mutate });
	const promise = run(() => mutate());
	expect(() => promise.updates()).toThrowKitError('server_api_unavailable', {
		contains: ['mutate(...).updates(...)']
	});
	await expect(promise).resolves.toBe('result');
});

test.each(['query', 'query.batch', 'query.live'])('%s cannot run while prerendering', (type) => {
	flags.prerendering = true;
	const read =
		type === 'query'
			? query(() => 1)
			: type === 'query.batch'
				? query.batch('unchecked', () => () => 1)
				: query.live(function* () {
						yield 1;
					});
	init({ read });
	expect(() => read(undefined)).toThrowKitError('remote_query_prerender', {
		contains: [type, 'read']
	});
});

test('server query overrides throw without starting the query', async () => {
	const fn = vi.fn(() => 1);
	const read = query(fn);
	init({ read });
	const resource = run(() => read());
	expect(() => resource.withOverride(() => 2)).toThrowKitError('server_api_unavailable', {
		contains: ['read.withOverride()']
	});
	expect(fn).not.toHaveBeenCalled();
	await expect(resource).resolves.toBe(1);
});

test('awaiting an empty live query rejects', async () => {
	const live = query.live(function* () {});
	init({ live });
	await expect(run(() => live())).rejects.toThrowKitError('remote_query_live_no_value', {
		contains: ['live']
	});
});

test.each(['validate', 'submit'])('remote form %s is browser-only', (method) => {
	const remote = form(() => 'result');
	expect(() => remote[/** @type {'validate' | 'submit'} */ (method)]()).toThrowKitError(
		'server_api_unavailable'
	);
});

test.each(['return', 'throw'])(
	'remote form rejects %s of fail(), preserving a thrown cause',
	async (mode) => {
		const failure = new ActionFailure(400, { field: 'invalid' });
		const remote = form(() => {
			if (mode === 'throw') throw failure;
			return failure;
		});
		const internals = /** @type {any} */ (remote).__;
		await expect(run(() => internals.fn({}, {}, null))).rejects.toThrowKitError(
			'remote_form_fail',
			{
				cause: mode === 'throw' ? failure : undefined
			}
		);
	}
);

test('remote form forwards validation issues, not catalog diagnostics', async () => {
	const issues = [{ message: 'user issue', path: ['name'] }];
	const remote = form(() => {
		throw new ValidationError(issues);
	});
	const internals = /** @type {any} */ (remote).__;
	const result = await run(() => internals.fn({}, {}, null));
	expect(result.issues).toEqual([
		{ name: 'name', path: ['name'], message: 'user issue', server: true }
	]);
});

test('production leaves returned and thrown action failures untouched', async () => {
	flags.DEV = false;
	const failure = new ActionFailure(400, { field: 'invalid' });
	const returned = form(() => failure);
	const thrown = form(() => {
		throw failure;
	});
	const result = await run(() => /** @type {any} */ (returned).__.fn({}, {}, null));
	expect(result.result).toBe(failure);
	await expect(run(() => /** @type {any} */ (thrown).__.fn({}, {}, null))).rejects.toBe(failure);
});

test('requested validates its function, context and limit', () => {
	const read = query(() => 1);
	expect(() => run(() => requested(/** @type {any} */ (() => {}), 1))).toThrowKitError(
		'remote_requested_invalid_query'
	);
	expect(() => run(() => requested(read, 1))).toThrowKitError('remote_requested_context');
	store.state = { ...store.state, is_in_remote_form_or_command: true };
	for (const limit of [-1, 0.5, NaN]) {
		expect(() => run(() => requested(read, limit))).toThrowKitError(
			'remote_requested_invalid_limit'
		);
	}
	expect([...run(() => requested(read, Infinity))]).toEqual([]);
});

test('requested refresh and reconnect methods retain their query-kind checks', async () => {
	store.state = { ...store.state, is_in_remote_form_or_command: true };
	const read = query(() => 1);
	const live = query.live(function* () {
		yield 1;
	});
	await expect(
		run(() => /** @type {any} */ (requested(live, 1)).refreshAll())
	).rejects.toThrowKitError('remote_requested_wrong_method', {
		contains: ['refreshAll', 'reconnectAll']
	});
	await expect(
		run(() => /** @type {any} */ (requested(read, 1)).reconnectAll())
	).rejects.toThrowKitError('remote_requested_wrong_method', {
		contains: ['reconnectAll', 'refreshAll']
	});
});

test('requested records async-validator misuse at synchronous iteration without throwing to the caller', async () => {
	const read = query(
		{
			'~standard': { version: 1, vendor: 'test', validate: (value) => Promise.resolve({ value }) }
		},
		() => 1
	);
	init({ read });
	store.state = { ...store.state, is_in_remote_form_or_command: true };
	const payload = stringify_remote_arg('input');
	store.state.remote.requested = new Map([['hash/read', new Set([payload])]]);
	expect([...run(() => requested(read, 1))]).toEqual([]);
	const internals = /** @type {any} */ (read).__;
	const failure = store.state.remote.data?.get(internals)?.[payload];
	await expect(failure).rejects.toThrowKitError('remote_requested_async_validator', {
		contains: ['read', '1']
	});
});
