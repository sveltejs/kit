import { onMount } from 'svelte';
import { updated_listener } from './utils.js';

/** @type {import('@sveltejs/kit').Page} */
export let page;

/** @type {{ current: import('@sveltejs/kit').Navigation | null }} */
export let navigating;

/** @type {{ current: boolean }} */
export let updated;

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
	navigating = { current: null };
	updated = { current: false };
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

	navigating = new (class Navigating {
		current = $state.raw(null);
	})();

	updated = new (class Updated {
		current = $state.raw(false);
	})();
	updated_listener.v = () => (updated.current = true);
}

/**
 * @param {import('@sveltejs/kit').Page} new_page
 */
export function update(new_page) {
	Object.assign(page, new_page);
}

// /** @type {Map<Function, Set<string>>} */
// export const load_fns = new Map();

// /**
//  * @param {(context: { depends: Function }) => Promise<any>} data_fn
//  */
// export function load(data_fn) {
// 	/** @type {Promise<any>} */
// 	let data_promise;
// 	let dependencies = new Set();
// 	let data = $state.raw();
// 	let pending = $state.raw(true);
// 	let error = $state.raw(null);

// 	/** @param {string} str */
// 	function depends(str) {
// 		dependencies.add(str);
// 	}

// 	// TODO handle race conditions etc
// 	function load_data() {
// 		pending = true;
// 		error = null;
// 		dependencies = new Set();
// 		data_promise = data_fn({ depends });

// 		data_promise
// 			.then((result) => {
// 				data = result;
// 				pending = false;
// 			})
// 			.catch((err) => {
// 				error = err;
// 				pending = false;
// 			})
// 			.finally(() => {
// 				load_fns.set(load_data, dependencies);
// 			});
// 	}

// 	$effect.pre(() => {
// 		load_fns.set(load_data, dependencies);
// 		return () => {
// 			load_fns.delete(load_data);
// 		};
// 	});

// 	$effect.pre(() => {
// 		load_data();
// 	});

// 	return {
// 		get data() {
// 			return data;
// 		},
// 		// for optimistic updates
// 		set data(new_data) {
// 			data = new_data;
// 		},
// 		get pending() {
// 			return pending;
// 		},
// 		get error() {
// 			return error;
// 		},
// 		refetch: load_data,
// 		/** @param {Function} fn */
// 		then: (fn) => {
// 			return new Promise(async (resolve, reject) => {
// 				while (!data_promise) {
// 					await new Promise((r) => setTimeout(r, 10));
// 				}
// 				data_promise
// 					.then((result) => {
// 						fn(result);
// 						resolve(result);
// 					})
// 					.catch((err) => {
// 						reject(err);
// 					});
// 			});
// 		}
// 	};
// }
