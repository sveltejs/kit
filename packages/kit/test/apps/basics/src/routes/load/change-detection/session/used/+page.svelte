<script>
	import { session } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;

	let count = 0;
	$: data.obj && count++;
</script>

<h2>{count}</h2>
<button on:click={() => ($session.calls = 123)}>Update $session</button>
