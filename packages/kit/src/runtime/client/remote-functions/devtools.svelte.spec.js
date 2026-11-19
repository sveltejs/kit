import { expect, test, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { flushSync, tick } from 'svelte';

vi.mock(new URL('../client.js', import.meta.url).pathname, () => ({
	app: { decoders: {}, encoders: {} },
	query_map: new Map(),
	query_responses: {},
	live_query_map: new Map(),
	_goto: () => {}
}));

vi.mock('#app/state/client', () => ({
	navigating: { current: null },
	page: { url: new URL('http://localhost/') },
	notify_version: () => {}
}));

const devtools = await import('./devtools.svelte.js');
const { QueryProxy } = await import('./query/proxy.js');
const { cache } = await import('./query/cache.js');
const { command } = await import('./command.svelte.js');
const { query_map, query_responses, app } = await import('../client.js');
const { stringify_remote_arg } = await import('../../shared.js');
const devalue = await import('devalue');

/** @type {any} */
let hook;
/** @type {any[]} */
let events;
/** @type {() => void} */
let unsubscribe;
/** @type {Array<() => void>} */
let cleanups;

beforeAll(() => {
	const announced = vi.fn();
	window.addEventListener(devtools.READY_EVENT, (e) => announced(/** @type {any} */ (e).detail));
	devtools.install_hook({ app: () => /** @type {any} */ (app), query_map });

	hook = /** @type {any} */ (window)[devtools.HOOK_NAME];
	expect(announced).toHaveBeenCalledWith(hook);
});

beforeEach(() => {
	query_map.clear();
	events = [];
	cleanups = [];
	unsubscribe = hook.subscribe((/** @type {any} */ event) => events.push(event));
});

afterEach(() => {
	unsubscribe();
	cleanups.forEach((fn) => fn());
	vi.unstubAllGlobals();
});

/**
 * create a query the way a component would, inside an effect root that keeps it alive
 * @param {string} id
 * @param {any} arg
 * @param {() => Promise<any>} fn
 * @returns {any}
 */
function use_query(id, arg, fn) {
	/** @type {any} */
	let proxy;
	cleanups.push(
		$effect.root(() => {
			proxy = new QueryProxy(id, arg, fn);
		})
	);
	flushSync();
	return proxy;
}

async function settle() {
	for (let i = 0; i < 3; i++) {
		await tick();
		await new Promise((r) => setTimeout(r, 0));
	}
	flushSync();
}

/** @param {string} key */
const query = (key) => hook.queries().find((/** @type {any} */ q) => q.key === key);

test('reports queries as they are created and change', async () => {
	const q = use_query('hash/get_post', { slug: 'a' }, () => Promise.resolve({ title: 'A' }));
	const key = `hash/get_post/${stringify_remote_arg({ slug: 'a' })}`;
	expect(events[0]).toMatchObject({ type: 'query:created', query: { key, status: 'loading' } });

	void q.current; // a reactive read starts the request
	await settle();

	expect(query(key)).toMatchObject({
		id: 'hash/get_post',
		name: 'get_post',
		arg: { slug: 'a' },
		status: 'ready',
		value: { title: 'A' },
		source: 'fetch'
	});
	expect(events.at(-1)).toMatchObject({ type: 'query:updated', query: { status: 'ready' } });

	q.set({ title: 'B' });
	await settle();
	expect(query(key)).toMatchObject({ value: { title: 'B' }, source: 'set' });
});

test('marks values hydrated from SSR', () => {
	const key = `hash/ssr/${stringify_remote_arg(1)}`;
	query_responses[key] = { v: 'from server' };
	use_query('hash/ssr', 1, () => Promise.resolve('fetched'));

	expect(query(key)).toMatchObject({ status: 'ready', value: 'from server', source: 'ssr' });
});

test('reports removal when the last reference goes away', async () => {
	use_query('hash/gone', undefined, () => Promise.resolve(1));
	// proxies are only released by gc, so simulate the last deref
	const entry = /** @type {any} */ (query_map.get('hash/gone')?.get(''));
	entry.proxy_count = 1;
	cache.deref(entry, 'hash/gone', '');
	await tick();

	expect(events.at(-1)).toMatchObject({ type: 'query:removed', key: 'hash/gone/' });
	expect(query('hash/gone/')).toBeUndefined();
});

test('reports a command, its override and the queries its response updated', async () => {
	const q = use_query('hash/get_todos', undefined, () => Promise.resolve(['a']));
	void q.current;
	await settle();

	vi.stubGlobal('fetch', () =>
		Promise.resolve(
			new Response(
				JSON.stringify({
					type: 'result',
					data: devalue.stringify({ _: 'ok', q: { 'hash/get_todos/': { v: ['a', 'b'] } } })
				})
			)
		)
	);

	const release = q.withOverride((/** @type {any} */ todos) => [...todos, 'b (optimistic)']);
	expect(await command('hash/add_todo')('b').updates(release)).toBe('ok');

	const started = events.find((e) => e.type === 'mutation:started');
	expect(started).toMatchObject({
		mutation: { type: 'command', name: 'add_todo' },
		arg: 'b',
		refreshes: ['hash/get_todos/'],
		overrides: ['hash/get_todos/']
	});
	expect(events.find((e) => e.type === 'mutation:settled')).toMatchObject({
		mutation: started.mutation,
		ok: true,
		result: 'ok',
		updated: ['hash/get_todos/'],
		duration: expect.any(Number)
	});

	await settle();
	expect(query('hash/get_todos/')).toMatchObject({ value: ['a', 'b'], source: 'mutation' });
});

test('reports nothing when no devtool is subscribed', async () => {
	unsubscribe();
	events.length = 0;
	vi.stubGlobal('fetch', () =>
		Promise.resolve(
			new Response(JSON.stringify({ type: 'result', data: devalue.stringify({ _: 1 }) }))
		)
	);

	const q = use_query('hash/quiet', undefined, () => Promise.resolve(1));
	void q.current;
	await command('hash/cmd')(undefined);
	await settle();

	expect(events).toEqual([]);
});
