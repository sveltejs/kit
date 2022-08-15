<script>
	import { session } from '$app/stores';

	/** @type {import('./$types').LayoutData} */
	export let data;

	let count = 0;
	$: data.obj && count++;
</script>

<h1>{count}</h1>
<button on:click={() => ($session.calls = 123)}>Rerun Layout Load Function</button>
<slot />
