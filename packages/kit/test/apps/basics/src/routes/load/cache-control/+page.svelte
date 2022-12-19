<script>
	import { invalidate } from '$app/navigation';
	import { _force_next_fetch } from './+page';

	/** @type {import('./$types').PageData} */
	export let data;

	/** @param {'default' | 'force' | 'bust'} type */
	async function fetch_again(type) {
		await fetch('/load/cache-control/increment');
		if (type === 'force') {
			_force_next_fetch();
		} else if (type === 'bust') {
			await fetch('/load/cache-control/count', {method: 'POST'});
		}
		await invalidate('/load/cache-control/count');
	}
</script>

<p>Count is {data.count}</p>
<button class="default" on:click={() => fetch_again('default')}>Fetch again</button>
<button class="force" on:click={() => fetch_again('force')}>Fetch again (force reload)</button>
<button class="bust" on:click={() => fetch_again('bust')}>Fetch again (prior POST request)</button>
