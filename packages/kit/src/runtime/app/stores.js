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
 * Un <span class='vo'>[store](https://sveltefr.dev/docs/sveltejs#store)</span> de lecture dont la valeur contient les données de page.
 *
 * Sur le serveur, il est uniquement possible de s'abonner à ce store pendant l'initialisation du composant. Dans le navigateur, vous pouvez vous y abonner à tout moment.
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
 * Un <span class='vo'>[store](https://sveltefr.dev/docs/sveltejs#store)</span> de lecture.
 * Lorsque la navigation démarre, la valeur de ce store est un objet `Navigation` avec les propriétés `from`, `to`, `type` et (si `type === 'popstate'`) `delta`.
 * Lorsque la navigation se termine, la valeur de ce store revient à `null`.
 *
 * Sur le serveur, il est uniquement possible de s'abonner à ce store pendant l'initialisation du composant. Dans le navigateur, vous pouvez vous y abonner à tout moment.
 *
 * @type {import('svelte/store').Readable<import('@sveltejs/kit').Navigation | null>}
 */
export const navigating = {
	subscribe(fn) {
		const store = __SVELTEKIT_DEV__ ? get_store('navigating') : getStores().navigating;
		return store.subscribe(fn);
	}
};

/**
 * Un <span class='vo'>[store](https://sveltefr.dev/docs/sveltejs#store)</span> de lecture dont la valeur initiale est `false`. Si [`version.pollInterval`](https://kit.sveltefr.dev/docs/configuration#version) est une valeur différente de zéro, SvelteKit va vérifier si une nouvelle version de l'application est disponible
 * et mettre à jour la valeur du store à `true` lorsque c'est le cas. `updated.check()` va forcer une vérification immédiate, peu importe la valeur de `version.pollInterval`.
 *
 * Sur le serveur, il est uniquement possible de s'abonner à ce store pendant l'initialisation du composant. Dans le navigateur, vous pouvez vous y abonner à tout moment.
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
	} catch (e) {
		throw new Error(
			`Cannot subscribe to '${name}' store on the server outside of a Svelte component, as it is bound to the current request via component context. This prevents state from leaking between users.` +
				'For more information, see https://kit.svelte.dev/docs/state-management#avoid-shared-state-on-the-server'
		);
	}
}
