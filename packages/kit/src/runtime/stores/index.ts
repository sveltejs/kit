import { getContext } from 'svelte';
import { Readable, Writable } from 'svelte/store';
import { PageContext } from '../navigation/types';

// these Svelte types are not exported, so repeating them here.
type Subscriber<T> = (value: T) => void;
type Updater<T> = (value: T) => T;

// const ssr = (import.meta as any).env.SSR;
const ssr = typeof window === 'undefined'; // TODO why doesn't previous line work in build?

export const getStores: () => {
	page: Readable<PageContext>;
	preloading: Readable<boolean>;
	session: Writable<any>;
} = () => getContext('__svelte__');

export const page = {
	subscribe(fn: Subscriber<PageContext>) {
		const store = getStores().page;
		return store.subscribe(fn);
	}
};

export const preloading = {
	subscribe(fn: Subscriber<boolean>) {
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
	subscribe(fn: Subscriber<any>) {
		const store = getStores().session;

		if (!ssr) {
			session.set = store.set;
			session.update = store.update;
		}

		return store.subscribe(fn);
	},
	set: (updater: Updater<any>) => {
		error('set');
	},
	update: (updater: Updater<any>) => {
		error('update');
	}
};
