<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageProps} */
	let { data } = $props();

	async function update() {
		// no trailing slash, so it differs from the normalized cache key
		await fetch(`http://localhost:${data.port}`, { method: 'POST' });
		await invalidate(`http://localhost:${data.port}`);
	}
</script>

<h1>count: {data.count}</h1>
<button onclick={update}>update</button>
