export const SNAPSHOT_KEY = 'sveltekit:snapshot';
export const SCROLL_KEY = 'sveltekit:scroll';
export const INDEX_KEY = 'sveltekit:index';

export const PRELOAD_PRIORITIES = /** @type {const} */ ({
	tap: 1,
	hover: 2,
	viewport: 3,
	eager: 4,
	off: -1
});
