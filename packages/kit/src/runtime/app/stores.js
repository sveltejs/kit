import { getContext } from 'svelte';

const ssr = import.meta.env.SSR;

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
	const stores = getContext('__svelte__');

	return {
		page: {
			subscribe: stores.page.subscribe
		},
		navigating: {
			subscribe: stores.navigating.subscribe
		},
		// TODO remove this (for 1.0? after 1.0?)
		// @ts-expect-error - deprecated, not part of type definitions, but still callable
		get preloading() {
			console.error('stores.preloading is deprecated; use stores.navigating instead');
			return {
				subscribe: stores.navigating.subscribe
			};
		},
		session: stores.session,
		i18n: {
			subscribe: stores.i18n.subscribe
		}
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

/** @type {typeof import('$app/stores').i18n} */
export const i18n = {
	/** @param {(value: any) => void} fn */
	subscribe(fn) {
		const store = getStores().i18n;
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

/** @type {typeof import('$app/stores').session} */
export const session = {
	subscribe(fn) {
		const store = getStores().session;

		if (!ssr) {
			session.set = store.set;
			session.update = store.update;
		}

		return store.subscribe(fn);
	},
	set: () => error('set'),
	update: () => error('update')
};
