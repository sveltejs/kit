<script>
	import { getStores } from '$app/stores';

	let pathname;
</script>

<h1>{`${pathname}`}</h1>

<button
	on:click={() => {
		getStores().page.subscribe(($page) => (pathname = $page.url.pathname))();
	}}>click</button
>
