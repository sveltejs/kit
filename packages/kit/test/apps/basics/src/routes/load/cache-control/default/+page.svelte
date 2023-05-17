<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;

	async function update() {
		window.update_state += 1;
		await fetch('/load/cache-control/default/increment');
		await invalidate('/load/cache-control/default/count');
		window.update_state += 1;
	}
</script>

<p class="counter">Count is {data.count}</p>
<button on:click={update}>update</button>
