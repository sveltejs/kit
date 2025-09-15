<script>
	import { invalidate, invalidateAll } from '$app/navigation';
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
			invalidateAll();
		} else {
			invalidate(`invalid:${str}`);
		}
	}
</script>

<button class="layout" on:click={() => update('layout')}>Invalidate layout</button>
<button class="page" on:click={() => update('page')}>Invalidate page</button>
<button class="all" on:click={() => update('all')}>Invalidate all</button>

<p>layout: {page.data.count_layout}, page: {page.data.count_page}</p>

<slot />
