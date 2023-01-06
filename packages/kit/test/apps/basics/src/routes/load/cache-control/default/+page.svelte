<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;

	async function update() {
		await fetch('/load/cache-control/default/increment');
		invalidate('/load/cache-control/default/count');
	}
</script>

<p>Count is {data.count}</p>
<button on:click={update}>update</button>
