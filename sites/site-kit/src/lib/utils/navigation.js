import { getStores } from '$app/stores';
import { onMount } from 'svelte';

export const getFragment = () => window.location.hash.slice(1);

// TODO this should probably live in Kit itself — https://github.com/sveltejs/kit/issues/560
// just putting it here for now because deadlines

/** @param {() => void | (() => void)} fn */
export function onNavigate(fn) {
	let mounted = false;

	/** @type {void | (() => void)} */
	let cleanup = null;

	const unsubscribe = getStores().page.subscribe(() => {
		if (cleanup) cleanup();
		if (mounted) cleanup = fn();
	});

	onMount(() => {
		mounted = true;
		cleanup = fn();

		return () => {
			unsubscribe();
			if (cleanup) cleanup();
			mounted = false;
		};
	});
}
