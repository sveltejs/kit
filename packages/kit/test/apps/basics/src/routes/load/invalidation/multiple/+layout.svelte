<script>
	import { refresh, refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import { increment_layout, increment_page } from './state';

	/** @param {string} str */
	async function update(str) {
		if (str !== 'page') {
			increment_layout();
		}
		if (str !== 'layout') {
			increment_page();
		}

		if (str === 'all') {
			refreshAll();
		} else {
			refresh(`invalid:${str}`);
		}
	}
</script>

<button class="layout" onclick={() => update('layout')}>Refresh layout</button>
<button class="page" onclick={() => update('page')}>Refresh page</button>
<button class="all" onclick={() => update('all')}>Refresh all</button>

<p>layout: {page.data.count_layout}, page: {page.data.count_page}</p>

<slot />
