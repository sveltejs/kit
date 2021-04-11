import { getContext, onDestroy } from 'svelte';

/**
 * @type {import('$app/a11y').setNavigationAnnouncer}
 */
export const setNavigationAnnouncer = (announcer) => {
	// <script> tags are run sequentially, the innermost child is run last
	// This means the innermost route which sets the announcer "wins" because it's last in the queue

	/**
	 * @type {{navigationAnnouncer: import('svelte/store').Writable<Array<(title: string) => string>>}}
	 */
	const stores = getContext('__svelte__');
	stores.navigationAnnouncer.update((announcers) => [...announcers, announcer]);

	onDestroy(() =>
		stores.navigationAnnouncer.update((announcers) => announcers.filter((a) => a !== announcer))
	);
};
