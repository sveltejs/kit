import { getContext } from 'svelte';

// const ssr = (import.meta as any).env.SSR;
const ssr = typeof window === 'undefined'; // TODO why doesn't previous line work in build?

// TODO remove this (for 1.0? after 1.0?)
let warned = false;
export function stores() {
	if (!warned) {
		console.error('stores() is deprecated; use getStores() instead');
		warned = true;
	}
	return getStores();
}

/** @typedef {import('svelte/store').Readable<{
 *   host: string;
 *   path: string;
 *   query: URLSearchParams;
 *   params: Record<string, string>
 * }>} PageStore */

export const getStores = () => {
	const stores = getContext('__svelte__');

	return {
		/** @type {PageStore} */
		page: {
			subscribe: stores.page.subscribe
		},
		/** @type {import('svelte/store').Readable<boolean>} */
		navigating: {
			subscribe: stores.navigating.subscribe
		},
		get preloading() {
			console.error('stores.preloading is deprecated; use stores.navigating instead');
			return {
				subscribe: stores.navigating.subscribe
			};
		},
		/** @type {import('svelte/store').Writable<any>} */
		session: stores.session
	};
};

/** @type {PageStore} */
export const page = {
	/** @param {(value: any) => void} fn */
	subscribe(fn) {
		const store = getStores().page;
		return store.subscribe(fn);
	}
};

/** @type {import('svelte/store').Readable<boolean>} */
export const navigating = {
	/** @param {(value: any) => void} fn */
	subscribe(fn) {
		const store = getStores().navigating;
		return store.subscribe(fn);
	}
};

/** @param {string} verb */
const error = (verb) => {
	throw new Error(
		ssr
			? `Can only ${verb} session store in browser`
			: `Cannot ${verb} session store before subscribing`
	);
};

/** @type {import('svelte/store').Writable<any>} */
export const session = {
	subscribe(fn) {
		const store = getStores().session;

		if (!ssr) {
			session.set = store.set;
			session.update = store.update;
		}

		return store.subscribe(fn);
	},
	set: (value) => {
		error('set');
	},
	update: (updater) => {
		error('update');
	}
};
