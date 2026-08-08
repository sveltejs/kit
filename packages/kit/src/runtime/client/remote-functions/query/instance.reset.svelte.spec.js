import { describe, expect, test, vi } from 'vitest';
import { mount, unmount, tick } from 'svelte';

// Mock `client.js` because the real one pulls in the SvelteKit
// router/hydration machinery and resolves `$app/paths` to a server-side
// virtual module that only exists during a real SvelteKit build.
vi.mock(new URL('../../client.js', import.meta.url).pathname, () => ({
	app: { hooks: { transport: {} }, decoders: {} },
	query_map: new Map(),
	query_responses: {},
	live_query_map: new Map(),
	_goto: () => {},
	handle_error: (/** @type {unknown} */ e) => e
}));

const { Query } = await import('./instance.svelte.js');
const { default: Harness } = await import('./reset-race-harness.spec.svelte');

/**
 * @param {() => boolean} predicate
 * @param {string} label
 */
async function wait_for(predicate, label) {
	for (let i = 0; i < 50; i++) {
		if (predicate()) return;
		await tick();
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
	throw new Error(`Timed out waiting for ${label}`);
}

function deferred() {
	/** @type {(value: any) => void} */
	let resolve = () => {};
	const promise = new Promise((r) => (resolve = r));
	return { promise, resolve };
}

describe('Query.reset', () => {
	// #16444: a render that evaluates while the resetting batch is still pending
	// reads the pre-reset promise through Svelte's time-travel overlay
	test('a reset survives a render that evaluates while the resetting batch is pending', async () => {
		const target = document.createElement('div');
		document.body.appendChild(target);

		let user_calls = 0;
		/** @type {{ promise: Promise<any>, resolve: (value: any) => void } | null} */
		let user_gate = null;
		const layout_query = new Query('user/', () => {
			user_calls += 1;
			if (user_gate) {
				const gate = user_gate;
				user_gate = null;
				return gate.promise;
			}
			return Promise.resolve(`user-${user_calls}`);
		});

		let items_calls = 0;
		const page_query = new Query('items/', () => {
			items_calls += 1;
			return Promise.resolve(`items-${items_calls}`);
		});

		const page = $state({ show: true });
		const app = mount(Harness, { target, props: { layout_query, page_query, page } });

		const text = (/** @type {string} */ id) =>
			target.querySelector(`[data-testid="${id}"]`)?.textContent;

		await wait_for(
			() => text('page') === 'items-1' && text('layout') === 'user-1',
			'initial render'
		);

		// the held `page_query` keeps the instance cached, like un-collected proxies do
		page.show = false;
		await tick();
		expect(text('page')).toBe(undefined);

		// an unresolved layout fetch keeps the reset batch pending
		const gate = deferred();
		user_gate = gate;

		// what `_goto` does in `accept` when a redirect lands
		layout_query.reset();
		page_query.reset();

		// re-render the destination from a separate batch, as a real navigation does
		await Promise.resolve();
		page.show = true;

		await Promise.resolve();
		gate.resolve('user-2');

		await wait_for(() => text('page') === 'items-2', 'page to show refetched data');
		await wait_for(() => text('layout') === 'user-2', 'layout to show refetched data');

		// a new fetch each, but not a duplicate one
		expect(items_calls).toBe(2);
		expect(user_calls).toBe(2);

		await unmount(app);
		target.remove();
	});
});
