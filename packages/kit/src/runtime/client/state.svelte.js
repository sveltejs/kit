import { onMount } from 'svelte';

/** @type {import('@sveltejs/kit').Page} */
export let page;

// this is a bootleg way to tell if we're in old svelte or new svelte
const is_legacy =
	onMount.toString().includes('$$') || /function \w+\(\) \{\}/.test(onMount.toString());

if (is_legacy) {
	page = {
		data: {},
		form: null,
		error: null,
		params: {},
		route: { id: null },
		state: {},
		status: -1,
		url: new URL('https://example.com')
	};
} else {
	page = new (class Page {
		data = $state.raw({});
		form = $state.raw(null);
		error = $state.raw(null);
		params = $state.raw({});
		route = $state.raw({ id: null });
		state = $state.raw({});
		status = $state.raw(-1);
		url = $state.raw(new URL('https://example.com'));
	})();
}

/**
 * @param {import('@sveltejs/kit').Page} new_page
 */
export function update(new_page) {
	Object.assign(page, new_page);
}
