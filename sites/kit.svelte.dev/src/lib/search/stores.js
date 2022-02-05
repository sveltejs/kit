import { writable } from 'svelte/store';

export const searching = writable(false);
export const query = writable('');

/**
 * @param {string} key
 * @param {any} fallback
 */
function storable(key, fallback) {
	try {
		let value = key in localStorage ? JSON.parse(localStorage[key]) : fallback;

		const store = writable(value);

		const set = (new_value) => {
			store.set((value = new_value));
			localStorage[key] = JSON.stringify(value);
		};

		return {
			subscribe: store.subscribe,
			set,
			update: (fn) => set(fn(value))
		};
	} catch {
		return writable(fallback);
	}
}

export const recent = storable('recent_searches', []);
