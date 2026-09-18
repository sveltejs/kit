<script>
	import { invalidate } from '$app/navigation';

	export let data;

	async function update() {
		await fetch('/load/fetch-cache-control/headers-diff', { method: 'POST' });
		await invalidate('/load/fetch-cache-control/headers-diff');
	}
</script>

<a href="/load/fetch-cache-control">fetch-cache-control</a>

<h2>{data.a.foo} / {data.b.foo}</h2>
<p>{data.a.count} / {data.b.count}</p>
<button onclick={update}>update</button>
