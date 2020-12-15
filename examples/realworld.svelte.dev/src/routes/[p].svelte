<script>
	import { page } from '$app/stores';
	import Home from '$components/Home.svelte';
</script>

<Home p={+$page.params.p}/>