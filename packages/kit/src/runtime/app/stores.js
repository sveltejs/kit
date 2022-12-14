import { getContext } from 'svelte';
import { browser } from './environment.js';
import { stores as browser_stores } from '../client/singletons.js';

/**
 * @type {import('$app/stores').getStores}
 */
export const getStores = () => {
	const stores = browser ? browser_stores : getContext('__svelte__');

	return {
		page: {
			subscribe: stores.page.subscribe
		},
		navigating: {
			subscribe: stores.navigating.subscribe
		},
		updated: stores.updated
	};
};

/** @type {typeof import('$app/stores').page} */
export const page = {
	/** @param {(value: any) => void} fn */
	subscribe(fn) {
		const store = getStores().page;
		return store.subscribe(fn);
	}
};

/** @type {typeof import('$app/stores').navigating} */
export const navigating = {
	subscribe(fn) {
		const store = getStores().navigating;
		return store.subscribe(fn);
	}
};

/** @type {typeof import('$app/stores').updated} */
export const updated = {
	subscribe(fn) {
		const store = getStores().updated;

		if (browser) {
			updated.check = store.check;
		}

		return store.subscribe(fn);
	},
	check: () => {
		throw new Error(
			browser
				? `Cannot check updated store before subscribing`
				: `Can only check updated store in browser`
		);
	}
};
