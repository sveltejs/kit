<script>
	import { invalidate } from '$app/navigation';
	/**
	 * @type {import('./$types').PageData}
	 */
	export let data;
	async function fetch_again() {
		await fetch('./cache-control/increment');
		invalidate('cache:control');
	}
</script>

<p>Count is {data.count}</p>
<button on:click={fetch_again}>Fetch again</button>
