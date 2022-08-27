<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>a: {data.a}, b: {data.b}</h1>

<button on:click={() => invalidate()}>invalidate</button>
