<script>
	import { stores } from '$app/client.js';
	import Nav from '$components/Nav.svelte';

	export let segment;
</script>

<Nav {segment}/>

<main>
	<slot></slot>
</main>