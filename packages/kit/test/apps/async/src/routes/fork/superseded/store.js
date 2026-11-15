import { readable } from 'svelte/store';

// counts the pages subscribed to it, including one rendered inside a preload fork
export const tracked = readable(0, () => {
	window.fork_store_subscribers = (window.fork_store_subscribers ?? 0) + 1;
	return () => {
		window.fork_store_subscribers -= 1;
	};
});
