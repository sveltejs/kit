<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;

	async function fetch_again() {
		await fetch('/load/cache-control/bust/increment');
		await fetch('/load/cache-control/bust/count', { method: 'POST' });
		invalidate('/load/cache-control/bust/count');
	}
</script>

<p>Count is {data.count}</p>
<button class="bust" on:click={() => fetch_again()}>Fetch again (prior POST request)</button>
