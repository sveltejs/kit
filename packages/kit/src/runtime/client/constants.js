export const SNAPSHOT_KEY = 'sveltekit:snapshot';
export const HISTORY_INFO_KEY = 'sveltekit:history-info';
export const HISTORY_METADATA_KEY = 'sveltekit:metadata';

export const PRELOAD_PRIORITIES = /** @type {const} */ ({
	tap: 1,
	hover: 2,
	viewport: 3,
	eager: 4,
	false: -1
});
