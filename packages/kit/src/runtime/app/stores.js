import { getContext } from 'svelte';
import { BROWSER } from 'esm-env';
import { stores as browser_stores } from '../client/client.js';

/**
 * A function that returns all of the contextual stores. On the server, this must be called during component initialization.
 * Only use this if you need to defer store subscription until after the component has mounted, for some reason.
 */
export const getStores = () => {
	const stores = BROWSER ? browser_stores : getContext('__svelte__');

	return {
		/** @type {typeof page} */
		page: {
			subscribe: stores.page.subscribe
		},
		/** @type {typeof navigating} */
		navigating: {
			subscribe: stores.navigating.subscribe
		},
		/** @type {typeof updated} */
		updated: stores.updated
	};
};

/**
 * A readable store whose value contains page data.
 *
 * On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
 *
 * @type {import('svelte/store').Readable<import('@sveltejs/kit').Page>}
 */
export const page = {
	subscribe(fn) {
		const store = __SVELTEKIT_DEV__ ? get_store('page') : getStores().page;
		return store.subscribe(fn);
	}
};

/**
 * A readable store.
 * When navigating starts, its value is a `Navigation` object with `from`, `to`, `type` and (if `type === 'popstate'`) `delta` properties.
 * When navigating finishes, its value reverts to `null`.
 *
 * On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
 * @type {import('svelte/store').Readable<import('@sveltejs/kit').Navigation | null>}
 */
export const navigating = {
	subscribe(fn) {
		const store = __SVELTEKIT_DEV__ ? get_store('navigating') : getStores().navigating;
		return store.subscribe(fn);
	}
};

/**
 * A readable store whose initial value is `false`. If [`version.pollInterval`](https://kit.svelte.dev/docs/configuration#version) is a non-zero value, SvelteKit will poll for new versions of the app and update the store value to `true` when it detects one. `updated.check()` will force an immediate check, regardless of polling.
 *
 * On the server, this store can only be subscribed to during component initialization. In the browser, it can be subscribed to at any time.
 * @type {import('svelte/store').Readable<boolean> & { check(): Promise<boolean> }}
 */
export const updated = {
	subscribe(fn) {
		const store = __SVELTEKIT_DEV__ ? get_store('updated') : getStores().updated;

		if (BROWSER) {
			updated.check = store.check;
		}

		return store.subscribe(fn);
	},
	check: () => {
		throw new Error(
			BROWSER
				? 'Cannot check updated store before subscribing'
				: 'Can only check updated store in browser'
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
	} catch {
		throw new Error(
			`Cannot subscribe to '${name}' store on the server outside of a Svelte component, as it is bound to the current request via component context. This prevents state from leaking between users.` +
				'For more information, see https://kit.svelte.dev/docs/state-management#avoid-shared-state-on-the-server'
		);
	}
}

/**
 * @template {keyof Stores}
 */
class ClientStores {
	constructor() {
		this.store = {}
	}

	getStore() {
		return this.store
	}
}


/** @typedef {Record<string, any>} Stores */

const local_stores = new ClientStores();

/** @type {{ getStore: () => Stores }}} */
// eslint-disable-next-line prefer-const
export const stores_object = {
	getStore() {
		return local_stores.getStore()
	}
}

let store_counter = 0;

/**
 * @param {any} initialValue
 */
export const unshared_writable = (initialValue) => {
	console.log('unshared_writable');
	store_counter++;

	/** @param {any} newValue */
	function set(newValue) {
		const stores = stores_object.getStore();
		if (!stores) throw new Error('AsyncLocalStorage is not available');

		stores[store_counter] ??= { value: initialValue, subscribers: [] };
		stores[store_counter].value = newValue;

		for (const fn of stores[store_counter].subscribers) {
			fn(newValue);
		}
	}

	/** @param {(value: any) => any} fn */
	async function update(fn) {
		const store = stores_object.getStore();
		if (!store) throw new Error('AsyncLocalStorage is not available');
		store[store_counter] ??= { value: initialValue, subscribers: [] };
		set(fn(store[store_counter].value));
	}

	/** @param {(value: any) => void} fn */
	function subscribe(fn) {
		const stores = stores_object.getStore();
		if (!stores) throw new Error('AsyncLocalStorage is not available');
		stores[store_counter] ??= { value: initialValue, subscribers: [] };
		stores[store_counter].subscribers.push(fn);

		fn(stores[store_counter].value);

		return () => {
			const index = stores[store_counter].subscribers.indexOf(fn);
			if (index !== -1) {
				stores[store_counter].subscribers.splice(index, 1);
			}
		};
	}

	return {
		subscribe,
		set,
		update
	};
}