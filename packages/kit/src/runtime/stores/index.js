import { getContext } from 'svelte';



// these Svelte types are not exported, so repeating them here.



// const ssr = (import.meta as any).env.SSR;
const ssr = typeof window === 'undefined'; // TODO why doesn't previous line work in build?

export const getStores



 = () => getContext('__svelte__');

export const page = {
	subscribe(fn) {
		const store = getStores().page;
		return store.subscribe(fn);
	}
};

export const preloading = {
	subscribe(fn) {
		const store = getStores().preloading;
		return store.subscribe(fn);
	}
};

const error = (verb) => {
	throw new Error(
		ssr
			? `Can only ${verb} session store in browser`
			: `Cannot ${verb} session store before subscribing`
	);
};

export const session = {
	subscribe(fn) {
		const store = getStores().session;

		if (!ssr) {
			session.set = store.set;
			session.update = store.update;
		}

		return store.subscribe(fn);
	},
	set: (updater) => {
		error('set');
	},
	update: (updater) => {
		error('update');
	}
};
