<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;

	async function fetch_again() {
		await fetch('/load/cache-control/force/increment');
		invalidate('/load/cache-control/force/count');
	}
</script>

<p>Count is {data.count}</p>
<button class="force" on:click={() => fetch_again()}>Fetch again (force reload)</button>
