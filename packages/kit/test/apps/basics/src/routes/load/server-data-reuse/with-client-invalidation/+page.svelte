<script>
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';

	export let data;

	onMount(() => invalidate('isomorphic-load'));
</script>

<p>Page with server load and isomorphic-load</p>

<pre>{JSON.stringify(data.from_server)}</pre>
