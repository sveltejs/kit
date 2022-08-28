import { getContext } from 'svelte';
import { browser } from './environment.js';
import { stores as browser_stores } from '../client/singletons.js';

// TODO remove this (for 1.0? after 1.0?)
let warned = false;
export function stores() {
	if (!warned) {
		console.error('stores() is deprecated; use getStores() instead');
		warned = true;
	}
	return getStores();
}

/**
 * @type {import('$app/stores').getStores}
 */
export const getStores = () => {
	const stores = browser ? browser_stores : getContext('__svelte__');

	const readonly_stores = {
		page: {
			subscribe: stores.page.subscribe
		},
		navigating: {
			subscribe: stores.navigating.subscribe
		},
		updated: stores.updated
	};

	// TODO remove this for 1.0
	Object.defineProperties(readonly_stores, {
		preloading: {
			get() {
				console.error('stores.preloading is deprecated; use stores.navigating instead');
				return {
					subscribe: stores.navigating.subscribe
				};
			},
			enumerable: false
		},
		session: {
			get() {
				removed_session();
				return {};
			},
			enumerable: false
		}
	});

	return readonly_stores;
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

function removed_session() {
	// TODO remove for 1.0
	throw new Error(
		'stores.session is no longer available. See https://github.com/sveltejs/kit/discussions/5883'
	);
}

export const session = {
	subscribe: removed_session,
	set: removed_session,
	update: removed_session
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
