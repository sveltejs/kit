<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;

	async function update() {
		await fetch('/load/cache-control/force/increment');
		invalidate('/load/cache-control/force/count');
	}
</script>

<p>Count is {data.count}</p>
<button on:click={update}>update</button>
