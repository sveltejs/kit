import { command, getRequestEvent, query, requested } from '$app/server';

export const echo = query('unchecked', (value) => value);
export const add = query('unchecked', ({ a, b }) => a + b);

/**
 * The mutable `count`/`should_fail_flaky` state is stored per browser session
 * (keyed by the `count_session` cookie set in `hooks.server.js`) so that tests
 * running in parallel against the same dev/preview server — e.g. `test.js` and
 * `client.test.js` on different Playwright workers — don't clobber each other's
 * in-memory state. Each Playwright test gets a fresh browser context, and thus
 * its own isolated state.
 * @typedef {{ count: number, should_fail_flaky: boolean }} SessionState
 * @type {Map<string, SessionState>}
 */
const sessions = new Map();

/** @returns {SessionState} */
function session() {
	const id = getRequestEvent().cookies.get('count_session') ?? 'default';
	let state = sessions.get(id);
	if (!state) {
		state = { count: 0, should_fail_flaky: false };
		sessions.set(id, state);
	}
	return state;
}

/**
 * @type {PromiseWithResolvers<any>[]}
 */
const deferreds = [];

// tracked per request event, so that parallel requests from other tests
// (e.g. SSR of this route in another playwright worker) don't interfere
const get_count_callers = new WeakSet();

export const get_count = query(() => {
	get_count_callers.add(getRequestEvent());
	return session().count;
});

export const set_count = command('unchecked', async ({ c, slow = false, deferred = false }) => {
	const state = session();

	if (deferred) {
		const deferred = Promise.withResolvers();
		deferreds.push(deferred);
		await deferred.promise;
	} else if (slow) {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	state.count = c;

	for (const { query } of requested(get_count, Infinity)) {
		await query.refresh();
	}

	return state.count;
});

export const set_count_refresh_all = command('unchecked', async (c) => {
	session().count = c;
	await requested(get_count, Infinity).refreshAll();
	return c;
});

export const get_flaky_count = query('unchecked', (key) => {
	const state = session();

	if (key === 'fail' && state.should_fail_flaky) {
		state.should_fail_flaky = false;
		throw new Error('flaky refresh failed');
	}

	return `${key}:${state.count}`;
});

export const set_count_partial_refresh = command('unchecked', async (c) => {
	const state = session();
	state.count = c;
	state.should_fail_flaky = true;

	for (const { query } of requested(get_flaky_count, Infinity)) {
		await query.refresh();
	}

	return c;
});

export const set_count_partial_refresh_all = command('unchecked', async (c) => {
	const state = session();
	state.count = c;
	state.should_fail_flaky = true;
	await requested(get_flaky_count, Infinity).refreshAll();
	return c;
});

export const resolve_deferreds = command(() => {
	for (const deferred of deferreds) {
		deferred.resolve(null);
	}
	deferreds.length = 0;
});

export const set_count_server_refresh = command('unchecked', (c) => {
	session().count = c;
	get_count().refresh();
	return c;
});

export const set_count_server_refresh_after_read = command('unchecked', async (c) => {
	await get_count();
	session().count = c;
	await get_count().refresh();
	return c;
});

export const set_count_server_set = command('unchecked', async (c) => {
	const event = getRequestEvent();
	session().count = c;
	get_count().set(c);
	await new Promise((resolve) => setTimeout(resolve, 100));
	if (get_count_callers.has(event)) {
		throw new Error('get_count should not have been called');
	}
	return c;
});
