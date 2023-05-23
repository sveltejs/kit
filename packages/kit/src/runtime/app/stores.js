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
		const store = __SVELTEKIT_DEV__ ? get_store('page') : getStores().page;
		return store.subscribe(fn);
	}
};

/** @type {typeof import('$app/stores').navigating} */
export const navigating = {
	subscribe(fn) {
		const store = __SVELTEKIT_DEV__ ? get_store('navigating') : getStores().navigating;
		return store.subscribe(fn);
	}
};

/** @type {typeof import('$app/stores').updated} */
export const updated = {
	subscribe(fn) {
		const store = __SVELTEKIT_DEV__ ? get_store('updated') : getStores().updated;

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

/**
 * @template {keyof ReturnType<typeof getStores>} Name
 * @param {Name} name
 * @returns {ReturnType<typeof getStores>[Name]}
 */
function get_store(name) {
	try {
		return getStores()[name];
	} catch (e) {
		throw new Error(
			`Cannot subscribe to '${name}' store on the server outside of a Svelte component, as it is bound to the current request via component context. This prevents state from leaking between users.` +
				'For more information, see https://kit.svelte.dev/docs/state-management#avoid-shared-state-on-the-server'
		);
	}
}
