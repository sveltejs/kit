<script>
	import { refresh } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;

	async function update() {
		await fetch('/load/cache-control/force/increment');
		refresh('/load/cache-control/force/count');
	}
</script>

<p class="counter">Count is {data.count}</p>
<button onclick={update}>update</button>
