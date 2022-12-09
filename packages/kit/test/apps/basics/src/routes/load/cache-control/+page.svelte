<script>
	import { invalidate } from '$app/navigation';
	import { _force_next_fetch } from './+page';

	/** @type {import('./$types').PageData} */
	export let data;

	/** @param {boolean} force */
	async function fetch_again(force) {
		await fetch('/load/cache-control/increment');
		if (force) {
			_force_next_fetch();
		}
		invalidate('/load/cache-control/count');
	}
</script>

<p>Count is {data.count}</p>
<button class="default" on:click={() => fetch_again(false)}>Fetch again</button>
<button class="force" on:click={() => fetch_again(true)}>Fetch again (force reload)</button>
