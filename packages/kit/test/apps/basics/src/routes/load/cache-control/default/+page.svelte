<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;

	let ticker = 0;
	async function update() {
		ticker += 1;
		await fetch('/load/cache-control/default/increment');
		await invalidate('/load/cache-control/default/count');
		ticker += 1;
	}
</script>

<p class="counter">Count is {data.count}</p>
<button on:click={update} data-ticker={ticker}>update</button>
