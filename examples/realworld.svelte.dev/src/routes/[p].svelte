<script>
	import { page } from '$app/stores';
	import Home from '$lib/Home.svelte';
</script>

<Home p={+$page.params.p}/>