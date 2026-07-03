<script>
	import { getStores } from '$app/stores';

	/** @type {string} */
	let pathname;
</script>

<h1>{`${pathname}`}</h1>

<button
	onclick={() => {
		getStores().page.subscribe(($page) => (pathname = $page.url.pathname))();
	}}>click</button
>
