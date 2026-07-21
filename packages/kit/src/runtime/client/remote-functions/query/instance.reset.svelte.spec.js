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
	goto: () => {}
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
	// Regression test for #16444: a remote form redirect navigation resets all
	// cached queries, but the destination page's query is re-rendered from a
	// different batch than the one holding the reset. While the reset batch is
	// still pending (the persistent layout's re-fired `await` keeps it so),
	// Svelte's time-travel overlay hands the render the pre-reset promise, and
	// the lazy init in `#get_promise` used to write that stale promise back
	// permanently, so the destination rendered stale data and never refetched.
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

		// navigate away from the page. The spec holds `page_query`, so the cached
		// instance survives, as it does in a real app whenever the proxies have
		// not been garbage collected yet
		page.show = false;
		await tick();
		expect(text('page')).toBe(undefined);

		// the next layout fetch hangs until we release it, which keeps the batch
		// created below pending across the page's re-render
		const gate = deferred();
		user_gate = gate;

		// redirect lands: reset all queries, as `_goto` does in its `accept`
		// callback. Resetting `layout_query` re-fires the layout's `await`, so
		// this batch stays pending on `user_gate`
		layout_query.reset();
		page_query.reset();

		// give the reset batch a chance to start processing, then re-render the
		// destination page from a separate batch, as a real navigation does
		await Promise.resolve();
		page.show = true;

		// release the layout fetch so everything can settle
		await Promise.resolve();
		gate.resolve('user-2');

		await wait_for(() => text('page') === 'items-2', 'page to show refetched data');
		await wait_for(() => text('layout') === 'user-2', 'layout to show refetched data');

		// exactly one refetch each: the reset must trigger a new fetch, but not
		// a duplicate one
		expect(items_calls).toBe(2);
		expect(user_calls).toBe(2);

		await unmount(app);
		target.remove();
	});
});
