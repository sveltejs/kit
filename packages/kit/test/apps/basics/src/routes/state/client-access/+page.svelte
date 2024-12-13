<script>
	import { page } from '$app/state';

	let pathname = $state();
</script>

<h1>{`${pathname}`}</h1>

<button
	onclick={() => {
		pathname = page.url.pathname;
	}}>click</button
>
